import type { Context, MiddlewareHandler } from "hono";
import { requestId as honoRequestId } from "hono/request-id";
import { randomBytes } from "node:crypto";

export type RequestIdGenerator = (c: Context) => string;

export function requestId(
  generator: RequestIdGenerator = () => randomBytes(16).toString("hex"),
): MiddlewareHandler {
  return honoRequestId({ generator });
}
