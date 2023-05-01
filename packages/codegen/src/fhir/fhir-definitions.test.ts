import { FhirDefinitions } from "./fhir-definitions";

describe("fhir-definitions", () => {
  ["r4b", "r5"].map((release) =>
    describe(release, () => {
      it("load", async () => {
        const result = await FhirDefinitions.load(release);
        expect(result.version).toMatch(/^\d+\.\d+\.\d+$/);
      });
    })
  );
});
