import type { Context, MiddlewareHandler } from "hono";

type RequestOriginVariables = {
  requestOrigin: string | undefined;
};

declare module "hono" {
  // oxlint-disable-next-line typescript/no-empty-object-type
  interface ContextVariableMap extends RequestOriginVariables {}
}

export type RequestOriginGetter = (c: Context) => string | undefined;

export function requestOrigin(getter: RequestOriginGetter): MiddlewareHandler {
  return async (c, next) => {
    c.set("requestOrigin", getter(c));

    await next();
  };
}
