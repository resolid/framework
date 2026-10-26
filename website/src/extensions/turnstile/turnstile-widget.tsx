import type { Ref } from "react";
import { Turnstile, type TurnstileInstance, type TurnstileProps } from "@marsidev/react-turnstile";

export type TurnstileWidgetProps = Omit<TurnstileProps, "siteKey"> & {
  ref?: Ref<TurnstileInstance | null>;
};

export function TurnstileWidget({ ref, ...rest }: TurnstileWidgetProps) {
  return <Turnstile ref={ref} siteKey={import.meta.env.VITE_TURNSTILE_KEY} {...rest} />;
}
