import { FhirUIRenderer } from "@bonfhir/ui/r5";
import { MantineFhirTable } from "./data-display/fhir-table.js";
import { MantineFhirValue } from "./data-display/fhir-value.js";
import {
  MantineFhirInputBoolean,
  MantineFhirPagination,
  MantineFhirQueryLoader,
} from "./index.js";
import { MantineFhirInputCode } from "./inputs/input-types/fhir-input-code.js";
import { MantineFhirInputCodeableConcept } from "./inputs/input-types/fhir-input-codeable-concept.js";
import { MantineFhirInputCoding } from "./inputs/input-types/fhir-input-coding.js";
import { MantineFhirInputDateTime } from "./inputs/input-types/fhir-input-date-time.js";
import { MantineFhirInputDate } from "./inputs/input-types/fhir-input-date.js";
import { MantineFhirInputNumber } from "./inputs/input-types/fhir-input-number.js";
import { MantineFhirInputString } from "./inputs/input-types/fhir-input-string.js";

export const MantineRenderer: FhirUIRenderer = {
  FhirInputBoolean: MantineFhirInputBoolean,
  FhirInputCode: MantineFhirInputCode,
  FhirInputCoding: MantineFhirInputCoding,
  FhirInputCodeableConcept: MantineFhirInputCodeableConcept,
  FhirInputDate: MantineFhirInputDate,
  FhirInputDateTime: MantineFhirInputDateTime,
  FhirInputNumber: MantineFhirInputNumber,
  FhirInputString: MantineFhirInputString,
  FhirPagination: MantineFhirPagination,
  FhirQueryLoader: MantineFhirQueryLoader,
  FhirTable: MantineFhirTable,
  FhirValue: MantineFhirValue,
};
