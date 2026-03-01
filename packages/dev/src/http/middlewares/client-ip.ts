import type { Context, MiddlewareHandler } from "hono";
import { createContext, type RouterContext, RouterContextProvider } from "react-router";

export const clientIpContext: RouterContext<string> = createContext<string>();

export function getClientIp(context: Readonly<RouterContextProvider> | Context): string {
  if (context instanceof RouterContextProvider) {
    return context.get(clientIpContext);
  }

  return (context as Context).get("clientIp");
}

type ClientIpVariables = {
  clientIp: string;
};

declare module "hono" {
  // oxlint-disable-next-line typescript/no-empty-object-type
  interface ContextVariableMap extends ClientIpVariables {}
}

export function clientIp(generator: (c: Context) => string): MiddlewareHandler {
  return async (c, next) => {
    c.set("clientIp", generator(c));

    await next();
  };
}
