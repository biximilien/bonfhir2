import { Range } from "../fhir-types.codegen";
import { Formatter } from "../formatters";
import { codeFormatter } from "./code";
import { decimalFormatter } from "./decimal";
import { RangeFormatterOptions, rangeFormatter } from "./range";

describe("range", () => {
  const formatter = new Formatter()
    .register(rangeFormatter)
    .register(decimalFormatter)
    .register(codeFormatter);

  it.each(<
    Array<[Range | undefined, RangeFormatterOptions | undefined, string]>
  >[
    [
      {
        low: { value: -1 },
        high: { value: 2.3 },
      },
      undefined,
      "[-1 ... 2.3]",
    ],
    [
      {
        low: { value: -1, unit: "g" },
        high: { value: 2.3 },
      },
      {
        notation: "scientific",
      },
      "[-1E0 ... 2.3E0]g",
    ],
  ])("format %p %p => %p", (value, options, expected) => {
    expect(formatter.format("Range", value, options)).toEqual(expected);
  });
});
