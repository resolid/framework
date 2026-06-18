import type { Context, MiddlewareHandler } from "hono";

export type ClientIpGetter = (c: Context) => string;

export function clientIp(getter: ClientIpGetter): MiddlewareHandler {
  return async (c, next) => {
    c.set("clientIp", getter(c));

    await next();
  };
}
