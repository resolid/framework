import type { Context, MiddlewareHandler } from "hono";
import { createContext, type RouterContext, RouterContextProvider } from "react-router";

export const requestOriginContext: RouterContext<string | undefined> = createContext<
  string | undefined
>();

export function getRequestOrigin(
  context: Readonly<RouterContextProvider> | Context,
): string | undefined {
  if (context instanceof RouterContextProvider) {
    return context.get(requestOriginContext);
  }

  return (context as Context).get("requestOrigin");
}

type RequestOriginVariables = {
  requestOrigin: string | undefined;
};

declare module "hono" {
  // oxlint-disable-next-line typescript/no-empty-object-type
  interface ContextVariableMap extends RequestOriginVariables {}
}

export function requestOrigin(generator: (c: Context) => string | undefined): MiddlewareHandler {
  return async (c, next) => {
    c.set("requestOrigin", generator(c));

    await next();
  };
}
