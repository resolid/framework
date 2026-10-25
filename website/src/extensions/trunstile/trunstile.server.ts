import type { TurnstileServerValidationResponse } from "@marsidev/react-turnstile";
import { env } from "node:process";

export async function trunstileVerify(token: string, remoteAddr?: string) {
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      secret: env.RX_TURNSTILE_SECRET,
      response: token,
      ...(remoteAddr ? { remoteip: remoteAddr } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const result: TurnstileServerValidationResponse = await response.json();

  return {
    success: result.success,
    error: result["error-codes"].length ? result["error-codes"][0] : null,
  };
}
