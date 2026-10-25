import type { Context, MiddlewareHandler } from "hono";

export type RemoteAddrGetter = (c: Context) => string;

export function remoteAddr(getter: RemoteAddrGetter): MiddlewareHandler {
  return async (c, next) => {
    c.set("remoteAddr", getter(c));

    await next();
  };
}
