import type { Context, MiddlewareHandler } from "hono";

type ClientIpVariables = {
  clientIp: string;
};

declare module "hono" {
  // oxlint-disable-next-line typescript/no-empty-object-type
  interface ContextVariableMap extends ClientIpVariables {}
}

export type ClientIpGetter = (c: Context) => string;

export function clientIp(getter: ClientIpGetter): MiddlewareHandler {
  return async (c, next) => {
    c.set("clientIp", getter(c));

    await next();
  };
}
