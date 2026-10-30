import type { Env, ContextVariableMap } from "hono";
import type { BlankEnv } from "hono/types";
import type { RouterContextProvider } from "react-router";
import { honoContext } from "./server";

export function getRouteContext<E extends Env = BlankEnv>(
  context: Readonly<RouterContextProvider>,
): Readonly<ContextVariableMap & { env: E }> {
  const hono = context.get(honoContext);

  return Object.assign(hono.var, { env: hono.env });
}
