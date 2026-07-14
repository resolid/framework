import type { Context, Env } from "hono";
import type { BlankEnv } from "hono/types";
import type { RouterContextProvider } from "react-router";
import { honoContext } from "./server";

export function getHonoContext<E extends Env = BlankEnv>(
  context: Readonly<RouterContextProvider>,
): Context<E> {
  return context.get(honoContext);
}
