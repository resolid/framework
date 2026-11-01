import type { Context, MiddlewareHandler } from "hono";

export type RequestInfo = {
  remoteAddr: string;
  publicOrigin: string;
};

export type RequestInfoGetter = (ctx: Context) => RequestInfo;

export function requestInfo(getter: RequestInfoGetter): MiddlewareHandler {
  return async (c, next) => {
    const info = getter(c);

    c.set("remoteAddr", info.remoteAddr);
    c.set("publicOrigin", info.publicOrigin);

    await next();
  };
}
