import {
  AnyResource,
  AnyResourceType,
  Bundle,
  ExtractResource,
  // #if fhir >= r5
  LinkRelationTypes,
  // #endif
  Meta,
  Reference,
  Resource,
  Retrieved,
} from "./fhir-types.codegen";
import { asArray, uniqBy } from "./lang-utils";

/**
 * Allows easy navigation inside a mixed bundle, principally returned by search operations.
 * Builds lazy indexes that allows fast resolution of references, search mode and types to
 * efficiently navigate resources contained in the bundle.
 *
 * Will _not_ perform network calls to resolve references, only resolve resources that are in the bundle.
 *
 * @example
 *    // bundle from /Patient?_include=Patient:managingOrganization&_revinclude=Provenance:target&_include:iterate=Provenance:agent
 *    const navigator = bundleNavigator<Patient>(bundle);
 *    for(const patient of navigator.searchMatch()) {
 *       const managingOrganization = navigator.reference(patient?.managingOrganization);
 *       const provenance = navigator.firstRevReference<Provenance>((provenance) => provenance.target, patient);
 *       // Use the dynamic proxy resolution to access the included resource
 *       const provenanceOrganization = provenance?.agent[0]?.who?.included
 *    }
 */
export function bundleNavigator<TResource extends Resource = Resource>(
  bundle: Bundle<TResource>
): BundleNavigator<TResource> {
  return new BundleNavigator<TResource>(bundle);
}

/**
 * Define a new type that adds an `included` property to a Reference<> that can be resolved automatically from the
 * incoming bundle, if it was included.
 */
export type ResolvableReference<TTargetResource extends Resource = Resource> =
  Reference<TTargetResource> & {
    /**
     * If the original bundle includes the reference (probably from a search query with _include instructions),
     * return the included resource, or undefined if it wasn't included or not found.
     */
    included: TTargetResource | undefined;
  };

/**
 * Defines a new type from T where all the Reference<> properties are replaced by ResolvableReference<>,
 * and with revIncluded method added at the root.
 */
export type WithResolvableReferences<T> = {
  [K in keyof T]: T[K] extends Reference<infer TTargetResource>
    ? ResolvableReference<TTargetResource>
    : T[K] extends Reference<infer TTargetResource> | undefined
    ? ResolvableReference<TTargetResource> | undefined
    : WithResolvableReferences<T[K]>;
} & {
  revIncluded: <TReferencedType extends AnyResource>(
    select: (
      resource: TReferencedType
    ) => Reference | Reference[] | null | undefined
  ) => WithResolvableReferences<TReferencedType>[];
};

export class BundleNavigator<TResource extends Resource = Resource> {
  // Index of resources by their reference - e.g. Patient/982effa0-aa0f-4995-b380-c1621b1f0ffc -> Patient
  // Built by _ensurePrimaryIndices.
  private _resourcesByRelativeReference:
    | Map<string, WithResolvableReferences<Resource>>
    | undefined;

  // Index of resources by their entry search mode - e.g. entry.search.mode = "search" or "include" - e.g.
  // "search" -> [Patient]
  // Built by _ensurePrimaryIndices.
  private _resourcesBySearchMode:
    | Map<
        "match" | "include" | "outcome",
        Array<WithResolvableReferences<Resource>>
      >
    | undefined;

  // Index of resources by their type - e.g. "Patient" or "Organization" - e.g.
  // "Organization" -> [Organization]
  // Built by _ensurePrimaryIndices.
  private _resourcesByType:
    | Map<AnyResourceType, Array<WithResolvableReferences<Resource>>>
    | undefined;

  // Index resources first by a select function expression indicating a reverse reference
  // (probably obtained through a _revinclude instruction), then by the actual reverse reference - e.g.
  // `(res) => res.target` -> Patient/982effa0-aa0f-4995-b380-c1621b1f0ffc -> [Provenance]
  // Built by _ensureSelectIndex
  private _resourcesByRefSelectIndex:
    | Map<string, Map<string, Array<WithResolvableReferences<Resource>>>>
    | undefined;

  /**
   * Initialize a new Bundle navigator, using an existing bundle.
   * Indexing is lazy and performed on-demand, so initialization is cheap.
   */
  constructor(
    private _bundleOrNavigator:
      | Bundle<TResource>
      | Array<BundleNavigator<TResource>>
  ) {}

  /**
   * Returns the current mode for this navigator:
   *  - bundle: navigates a single bundle
   *  - aggregator: navigates an array of bundle navigators
   */
  public get navigatorMode(): "bundle" | "aggregator" {
    return Array.isArray(this._bundleOrNavigator) ? "aggregator" : "bundle";
  }

  /**
   * Access the underlying bundle.
   */
  public get bundle(): Bundle<Retrieved<TResource>> {
    if (Array.isArray(this._bundleOrNavigator)) {
      throw new TypeError(
        "Cannot access bundle on a bundle navigator that was created from an array of bundle navigators"
      );
    }
    return this._bundleOrNavigator as Bundle<Retrieved<TResource>>;
  }

  public toJSON() {
    return this._bundleOrNavigator;
  }

  /**
   * Return a resource identifies by its unique reference, or undefined if not found.
   * If there are duplicates in the bundle, will return one of them.
   *
   * @param reference: the relative resource reference as a string or a Reference<> - e.g. Patient/982effa0-aa0f-4995-b380-c1621b1f0ffc
   */
  public reference<TReferencedType extends AnyResource>(
    reference: string | Reference<TReferencedType> | null | undefined
  ): WithResolvableReferences<Retrieved<TReferencedType>> | undefined {
    if (Array.isArray(this._bundleOrNavigator)) {
      for (const navigator of this._bundleOrNavigator) {
        const res = navigator.reference(reference);
        if (res) {
          return res;
        }
      }
      return;
    }

    const finalReference =
      typeof reference === "string" ? reference : reference?.reference;
    if (!finalReference?.length) {
      return undefined;
    }

    this._ensurePrimaryIndices();

    return (this._resourcesByRelativeReference?.get(finalReference) ||
      undefined) as
      | WithResolvableReferences<Retrieved<TReferencedType>>
      | undefined;
  }

  /**
   * Return matching resources that have the reference returned by the specified select expression
   * This can be used to find associated resource returned as part of a revinclude search parameter.
   * @param select - the select function to index the resources. - e.g. `claim => claim.patient`
   * @param reference - the resource reference to match with the values returned by the select - e.g. "Patient/59ba0a80-035a-4a8e-930b-d9f6c523b97a"
   *
   * @example
   *   navigator.refReference<Appointment>(appointment => appointment.participant.actor, "Practitioner/06549508-aae9-4d82-a937-0ddeb0f2de38");
   *
   * @see http://hl7.org/fhir/fhirpath.html
   */
  public revReference<TReferencedType extends AnyResource>(
    select: (
      resource: TReferencedType
    ) => Reference | Reference[] | null | undefined,
    reference: Retrieved<AnyResource> | string | null | undefined
  ): WithResolvableReferences<Retrieved<TReferencedType>>[] {
    if (!reference) {
      return [];
    }

    if (Array.isArray(this._bundleOrNavigator)) {
      for (const navigator of this._bundleOrNavigator) {
        const res = navigator.revReference(select, reference);
        if (res.length > 0) {
          return res;
        }
      }
      return [];
    }

    const finalReference =
      typeof reference === "string"
        ? reference
        : `${reference.resourceType}/${reference.id}`;
    if (finalReference.length === 0) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._ensureSelectIndex(select as any);

    return (this._resourcesByRefSelectIndex
      ?.get(select.toString())
      ?.get(finalReference) || []) as WithResolvableReferences<
      Retrieved<TReferencedType>
    >[];
  }

  /**
   * Get all the resources that have a search mode of match (e.g. the primary resource or the bundle).
   * This is useful to iterate over the primary resource for a search.
   */
  public searchMatch<
    TResult extends Resource = TResource
  >(): WithResolvableReferences<Retrieved<TResult>>[] {
    if (Array.isArray(this._bundleOrNavigator)) {
      return this._bundleOrNavigator.flatMap((nav) => nav.searchMatch());
    }

    this._ensurePrimaryIndices();

    return (this._resourcesBySearchMode?.get("match") ||
      []) as unknown as WithResolvableReferences<Retrieved<TResult>>[];
  }

  /**
   * Get the first entry in the bundle that has a search mode of match.
   * If there aren't, or there are multiple results, throw an error.
   * If you want to return undefined on not found, you should use `searchMatch()[0]` instead.
   */
  public searchMatchOne<
    TResult extends Resource = TResource
  >(): WithResolvableReferences<Retrieved<TResult>> {
    if (Array.isArray(this._bundleOrNavigator)) {
      if (this._bundleOrNavigator.length === 0) {
        throw new Error(`No match found in bundle`);
      }

      if (this._bundleOrNavigator.length > 1) {
        throw new Error(`Cannot searchMatchOne on multiple bundles`);
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this._bundleOrNavigator[0]!.searchMatchOne<TResult>();
    }
    const searchMatches = this.searchMatch<TResult>();
    if (searchMatches.length === 0) {
      throw new Error(`No match found in bundle`);
    }

    if (searchMatches.length > 1) {
      throw new Error(`Multiple search matches found in bundle`);
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return searchMatches[0]!;
  }

  /**
   * Get all the resources of a specific type.
   */
  public type<TResourceType extends AnyResourceType = AnyResourceType>(
    type: TResourceType
  ): WithResolvableReferences<Retrieved<ExtractResource<TResourceType>>>[] {
    if (Array.isArray(this._bundleOrNavigator)) {
      return uniqBy(
        this._bundleOrNavigator.flatMap((nav) => nav.type(type)),
        (res) => `${res.id}${(res.meta as Meta)?.versionId}`
      );
    }

    this._ensurePrimaryIndices();

    return (this._resourcesByType?.get(type) || []) as WithResolvableReferences<
      Retrieved<ExtractResource<TResourceType>>
    >[];
  }

  /**
   * Return all unique resources in the bundle.
   **/
  public resources<TResource extends AnyResource = AnyResource>(): Array<
    WithResolvableReferences<TResource>
  > {
    if (Array.isArray(this._bundleOrNavigator)) {
      return uniqBy(
        this._bundleOrNavigator.flatMap((nav) => nav.resources()),
        (res) => `${res.id}${(res.meta as Meta)?.versionId}`
      );
    }

    this._ensurePrimaryIndices();
    return [
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      ...this._resourcesByRelativeReference!.values(),
    ] as WithResolvableReferences<TResource>[];
  }

  /**
   * Return the url associated with a link, characterized by a relation.
   */
  public linkUrl(
    relation: "self" | "first" | "next" | "previous"
  ): string | undefined;
  // #if fhir >= r5
  public linkUrl(relation: LinkRelationTypes): string | undefined;
  // #endif
  public linkUrl(relation: string): string | undefined {
    if (Array.isArray(this._bundleOrNavigator)) {
      return;
    }

    return this.bundle.link?.find((link) => link.relation === relation)?.url;
  }

  /**
   * If a set of search matches, this is the (potentially estimated) total number of
   * entries of type 'match' across all pages in the search.  It does not include
   * search.mode = 'include' or 'outcome' entries and it does not provide a count of
   * the number of entries in the Bundle.
   * @see {@link http://hl7.org/fhir/Bundle-definitions.html#Bundle.total}
   * @fhirType unsignedInt
   */
  public get total(): number | undefined {
    if (Array.isArray(this._bundleOrNavigator)) {
      if (this._bundleOrNavigator[0]?.total == undefined) {
        return undefined;
      }

      return this._bundleOrNavigator.reduce(
        (sum, nav) => sum + (nav.total ?? 0),
        0
      );
    }
    return this.bundle.total;
  }

  private _ensurePrimaryIndices() {
    if (!this._resourcesByRelativeReference) {
      this._resourcesByRelativeReference = new Map();
      this._resourcesBySearchMode = new Map();
      this._resourcesByType = new Map();

      for (const entry of (this.bundle.entry || []).filter(Boolean) || []) {
        if (entry.resource) {
          const resolvableResource = withResolvableProxy(
            entry.resource,
            this
          ) as WithResolvableReferences<Resource>;
          if (entry.resource?.id?.length) {
            this._resourcesByRelativeReference.set(
              `${entry.resource.resourceType}/${entry.resource.id}`,
              resolvableResource
            );

            if (entry.resource.meta?.versionId?.length) {
              this._resourcesByRelativeReference.set(
                `${entry.resource.resourceType}/${entry.resource.id}/_history/${entry.resource.meta.versionId}`,
                resolvableResource
              );
            }
          }

          if (entry.search?.mode?.length) {
            if (!this._resourcesBySearchMode.has(entry.search.mode)) {
              this._resourcesBySearchMode.set(entry.search.mode, []);
            }

            this._resourcesBySearchMode
              .get(entry.search.mode)
              ?.push(resolvableResource);
          }

          if (entry.resource.resourceType?.length) {
            if (!this._resourcesByType.has(entry.resource.resourceType)) {
              this._resourcesByType.set(entry.resource.resourceType, []);
            }

            this._resourcesByType
              .get(entry.resource.resourceType)
              ?.push(resolvableResource);
          }
        }
      }
    }
  }

  private _ensureSelectIndex(
    select: (res: unknown) => Reference | Reference[] | null | undefined
  ): void {
    if (!this._resourcesByRefSelectIndex) {
      this._resourcesByRefSelectIndex = new Map();
    }

    if (!this._resourcesByRefSelectIndex.has(select.toString())) {
      const mappedByReference = new Map();
      for (const entry of (this.bundle.entry || []).filter(Boolean) || []) {
        for (const reference of asArray(select(entry.resource) || []).filter(
          (ref) => !!ref?.reference
        )) {
          if (entry.resource) {
            if (!mappedByReference.has(reference.reference)) {
              mappedByReference.set(reference.reference, []);
            }

            const resolvableReference = withResolvableProxy(
              entry.resource,
              this
            );
            mappedByReference
              .get(reference.reference)
              .push(resolvableReference);
          }
        }
      }
      this._resourcesByRefSelectIndex.set(select.toString(), mappedByReference);
    }
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function withResolvableProxy<T extends Resource>(
  resource: T,
  navigator: BundleNavigator<T>
): WithResolvableReferences<T> {
  if (typeof resource !== "object" || !resource) {
    return resource;
  }

  return new Proxy(resource, {
    get: (target, prop) => {
      if (prop === "included" && (target as Reference)?.reference) {
        return navigator.reference((target as Reference)?.reference);
      }

      if (prop === "revIncluded" && (target as Resource).resourceType) {
        return (
          select: (resource: any) => Reference | Reference[] | null | undefined
        ) => navigator.revReference(select, target as any);
      }

      return withResolvableProxy(Reflect.get(target, prop) as any, navigator);
    },
  }) as unknown as WithResolvableReferences<T>;
}
/* eslint-enable */
