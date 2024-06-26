import { ValueFormatter } from "../formatters";
import { DatetimeFormatterOptions, dateTimeFormatter } from "./date-time";

/**
 * A instant, or partial instant (e.g. just year or year + month) as used in human communication.
 *
 * @see https://hl7.org/fhir/datatypes.html#instant
 */
export type InstantFormatterOptions = DatetimeFormatterOptions;

export const instantFormatter: ValueFormatter<
  "instant",
  string | null | undefined,
  InstantFormatterOptions | null | undefined
> = {
  type: "instant",
  format: dateTimeFormatter.format,
};
