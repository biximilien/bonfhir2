import { FhirInputNumberRendererProps } from "@bonfhir/react/r4b";
import { NumberInput, NumberInputProps } from "@mantine/core";
import { ReactElement } from "react";

export function MantineFhirInputNumber(
  props: FhirInputNumberRendererProps<MantineFhirInputNumberProps>,
): ReactElement | null {
  return (
    <NumberInput
      className={props.className}
      style={props.style}
      label={props.label}
      description={props.description}
      error={props.error}
      required={Boolean(props.required)}
      disabled={Boolean(props.disabled)}
      min={defaultMin(props) ?? undefined}
      max={props.max ?? undefined}
      step={props.step ?? undefined}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      decimalScale={(props as any).precision}
      value={props.value ?? undefined}
      onChange={(value: string | number | "") =>
        props.onChange?.(
          value === ""
            ? undefined
            : typeof value === "string"
              ? Number(value)
              : value,
        )
      }
      styles={{
        input: {
          textAlign: "right",
        },
      }}
      {...props.rendererProps}
    />
  );
}

export type MantineFhirInputNumberProps = NumberInputProps;

function defaultMin(
  props: FhirInputNumberRendererProps<MantineFhirInputNumberProps>,
) {
  switch (props.type) {
    case "unsignedInt": {
      return Math.max(props.min ?? 0, 0);
    }
    case "positiveInt": {
      return Math.max(props.min ?? 1, 1);
    }
  }
  return props.min;
}
