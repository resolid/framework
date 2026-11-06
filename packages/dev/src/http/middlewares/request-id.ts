import type { Context, MiddlewareHandler } from "hono";
import { requestId as honoRequestId } from "hono/request-id";

export type RequestIdGenerator = (c: Context) => string;

export function requestId(
  generator: RequestIdGenerator = () => globalThis.crypto.randomUUID(),
): MiddlewareHandler {
  return honoRequestId({ generator });
}
