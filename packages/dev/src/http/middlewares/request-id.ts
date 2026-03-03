import type { Context, MiddlewareHandler } from "hono";
import { requestId as honoRequestId, type RequestIdVariables } from "hono/request-id";
import { randomBytes } from "node:crypto";

export type RequestIdGenerator = (c: Context) => string;

declare module "hono" {
  // oxlint-disable-next-line typescript/no-empty-object-type
  interface ContextVariableMap extends RequestIdVariables {}
}

export function requestId(
  generator: RequestIdGenerator = () => randomBytes(16).toString("hex"),
): MiddlewareHandler {
  return honoRequestId({ generator });
}
