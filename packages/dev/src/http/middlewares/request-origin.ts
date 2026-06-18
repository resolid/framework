import type { Context, MiddlewareHandler } from "hono";

export type RequestOriginGetter = (c: Context) => string | undefined;

export function requestOrigin(getter: RequestOriginGetter): MiddlewareHandler {
  return async (c, next) => {
    c.set("requestOrigin", getter(c));

    await next();
  };
}
