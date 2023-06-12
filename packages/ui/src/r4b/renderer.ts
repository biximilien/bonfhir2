import type { FhirTableRenderer } from "./data-display/fhir-table.js";
import type { FhirValueRenderer } from "./data-display/fhir-value.js";
import type { FhirQueryLoaderRenderer } from "./feedback/fhir-query-loader.js";
import type {
  FhirInputCodeRenderer,
  FhirInputCodeableConceptRenderer,
  FhirInputCodingRenderer,
  FhirInputDateRenderer,
  FhirInputDateTimeRenderer,
  FhirInputStringRenderer,
} from "./inputs/input-types/index.js";
import type { FhirPaginationRenderer } from "./navigation/fhir-pagination.js";

export interface FhirUIRenderer {
  FhirInputCode: FhirInputCodeRenderer;
  FhirInputCoding: FhirInputCodingRenderer;
  FhirInputCodeableConcept: FhirInputCodeableConceptRenderer;
  FhirInputDate: FhirInputDateRenderer;
  FhirInputDateTime: FhirInputDateTimeRenderer;
  FhirInputString: FhirInputStringRenderer;
  FhirPagination: FhirPaginationRenderer;
  FhirQueryLoader: FhirQueryLoaderRenderer;
  FhirTable: FhirTableRenderer;
  FhirValue: FhirValueRenderer;
}
