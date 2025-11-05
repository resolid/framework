import { type Context, type Env, Hono } from "hono";
import type { HonoOptions } from "hono/hono-base";
import type { BlankEnv } from "hono/types";
import process from "node:process";
import {
  type AppLoadContext,
  createRequestHandler,
  type RouterContextProvider,
  type ServerBuild,
  type UNSAFE_MiddlewareEnabled,
} from "react-router";

import type { Http2Bindings, HttpBindings } from "@hono/node-server";
import type { Context as HonoContext } from "hono";

export type NodeEnv = { Bindings: HttpBindings | Http2Bindings };
export type { HonoContext };

type ReactRouterAppLoadContext = UNSAFE_MiddlewareEnabled extends true ? RouterContextProvider : AppLoadContext;

export type HonoServerOptions<E extends Env = BlankEnv> = {
  configure?: <E extends Env = BlankEnv>(app: Hono<E>) => Promise<void> | void;
  getLoadContext?: (
    c: Context<E>,
    options: {
      build: ServerBuild;
      mode?: string;
    },
  ) => Promise<ReactRouterAppLoadContext> | ReactRouterAppLoadContext;
  onShutdown?: () => Promise<void> | void;
  honoOptions?: HonoOptions<E>;
};

export async function createHonoServer<E extends Env = BlankEnv>(
  mode: string | undefined,
  options: HonoServerOptions<E> = {},
): Promise<Hono<E>> {
  const server = new Hono<E>(options.honoOptions);

  if (options.configure) {
    await options.configure(server);
  }

  server.use("*", async (c) => {
    const build: ServerBuild = (await import(
      // @ts-expect-error - Virtual module provided by React Router at build time
      "virtual:react-router/server-build"
    )) as ServerBuild;

    return (async (c) => {
      const requestHandler = createRequestHandler(build, mode);
      const loadContext = options.getLoadContext?.(c, { build, mode });
      return requestHandler(c.req.raw, loadContext instanceof Promise ? await loadContext : loadContext);
    })(c);
  });

  async function shutdown() {
    options.onShutdown?.();

    process.removeListener("SIGINT", shutdown);
    process.removeListener("SIGTERM", shutdown);

    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return server;
}
