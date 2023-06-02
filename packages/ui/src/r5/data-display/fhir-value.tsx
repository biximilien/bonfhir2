import { ReactElement, createElement } from "react";
import { useFhirUIContext } from "../context.js";

export interface FhirValueProps<TRendererProps = any> {
  type: string;
  value: unknown;
  options?: any;
  rendererProps?: TRendererProps;
}

export function FhirValue<TRendererProps = any>(
  props: FhirValueProps<TRendererProps>
): ReactElement | null {
  const {
    formatter,
    renderer: { FhirValue },
  } = useFhirUIContext();

  const formattedValue = formatter.format(
    props.type,
    props.value as never,
    props.options
  );

  return createElement(FhirValue, {
    ...props,
    formattedValue,
  });
}

export interface FhirValueRendererProps<TRendererProps = any>
  extends FhirValueProps<TRendererProps> {
  formattedValue: string;
}

export type FhirValueRenderer = (
  props: FhirValueRendererProps
) => ReactElement | null;