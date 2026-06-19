import type { Http2Bindings, HttpBindings } from "@hono/node-server";
import type { MaybePromise } from "@resolid/utils";
import type { HonoOptions } from "hono/hono-base";
import type { BlankEnv } from "hono/types";
import { type Context, type Env, Hono } from "hono";
import { createRequestHandler, RouterContextProvider } from "react-router";
import { honoContext } from "./context";

export type NodeEnv = {
  // oxlint-disable-next-line typescript/no-redundant-type-constituents
  Bindings: HttpBindings | Http2Bindings;
};

export type ConfigureLoadContext<E extends Env = BlankEnv> = (
  loadContext: RouterContextProvider,
  context: Context<E>,
  mode?: string,
) => MaybePromise<void>;

export interface HonoServerOptions<E extends Env = BlankEnv> {
  configure?: <E extends Env = BlankEnv>(app: Hono<E>) => Promise<void> | void;
  honoOptions?: HonoOptions<E>;
  configureLoadContext?: ConfigureLoadContext<E>;
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
      const requestHandler = createRequestHandler(
        // @ts-expect-error - Virtual module provided by React Router at build time
        await import("virtual:react-router/server-build"),
        mode,
      );
      const loadContext = new RouterContextProvider();
      loadContext.set(honoContext, ctx);
      await options.configureLoadContext?.(loadContext, ctx, mode);

      return requestHandler(ctx.req.raw, loadContext);
    })(c);
  });

  app.route(basename, routeApp);

  if (basename) {
    app.route(`${basename}.data`, routeApp);
  }

  return app;
}
