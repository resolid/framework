import type { Http2Bindings, HttpBindings } from "@hono/node-server";
import type { HonoOptions } from "hono/hono-base";
import type { BlankEnv } from "hono/types";
import { type Context, type Env, Hono } from "hono";
import {
  type AppLoadContext,
  createRequestHandler,
  RouterContextProvider,
  type ServerBuild,
} from "react-router";
// @ts-expect-error - Virtual module provided by React Router at build time
import * as build from "virtual:react-router/server-build";

export type NodeEnv = {
  Bindings: HttpBindings | Http2Bindings;
};

export interface HonoServerOptions<E extends Env = BlankEnv> {
  configure?: <E extends Env = BlankEnv>(app: Hono<E>) => Promise<void> | void;
  honoOptions?: HonoOptions<E>;
  getLoadContext?: (
    c: Context<E>,
    options: {
      build: ServerBuild;
      mode?: string;
    },
  ) => Promise<RouterContextProvider> | RouterContextProvider;
}

export async function createHonoServer<E extends Env = BlankEnv>(
  mode: string | undefined,
  options: HonoServerOptions<E>,
): Promise<Hono<E>> {
  const basename = import.meta.env.RESOLID_BASENAME;

  const app: Hono<E> = new Hono(options.honoOptions);

  if (options.configure) {
    await options.configure(app);
  }

  const routeApp: Hono<E> = new Hono({
    strict: false,
  });

  routeApp.use(async (c) => {
    return (async (ctx) => {
      const requestHandler = createRequestHandler(build, mode);
      const getLoadContext = options.getLoadContext?.(ctx, { build, mode });
      const loadContext =
        (getLoadContext instanceof Promise ? await getLoadContext : getLoadContext) ??
        new RouterContextProvider();

      Object.assign(loadContext, { hono: ctx });

      return requestHandler(ctx.req.raw, loadContext as unknown as AppLoadContext);
    })(c);
  });

  app.route(basename, routeApp);

  if (basename) {
    app.route(`${basename}.data`, routeApp);
  }

  return app;
}
