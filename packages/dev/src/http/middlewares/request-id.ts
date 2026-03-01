import type { Context } from "hono";
import { createContext, type RouterContext, RouterContextProvider } from "react-router";

export const requestIdContext: RouterContext<string> = createContext<string>();

export function getRequestId(context: Readonly<RouterContextProvider> | Context): string {
  if (context instanceof RouterContextProvider) {
    return context.get(requestIdContext);
  }

  return (context as Context).get("requestId");
}
