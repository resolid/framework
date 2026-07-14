import type { Http2Bindings, HttpBindings } from "@hono/node-server";
import type { MaybePromise } from "@resolid/utils";
import type { HonoOptions } from "hono/hono-base";
import { type Context, type Env, Hono } from "hono";
import {
  createContext,
  createRequestHandler,
  type RouterContext,
  RouterContextProvider,
} from "react-router";

export const honoContext: RouterContext<Context> = createContext<Context>();

export type NodeEnv = {
  Bindings: HttpBindings | Http2Bindings;
};

export interface HonoServerOptions<E extends Env> {
  honoConfig?: (hono: Hono<E>) => MaybePromise<void>;
  honoOptions?: HonoOptions<E>;
}

export async function createHonoServer<E extends Env>(
  mode: string | undefined,
  options: HonoServerOptions<E>,
): Promise<Hono<E>> {
  const hono: Hono<E> = new Hono(options.honoOptions);

  if (options.honoConfig) {
    await options.honoConfig(hono);
  }

  const app: Hono<E> = new Hono({
    strict: false,
  });

  // @ts-expect-error - Virtual module provided by React Router at build time
  const build = import("virtual:react-router/server-build");

  app.use(async (ctx) => {
    const requestHandler = createRequestHandler(await build, mode);
    const loadContext = new RouterContextProvider();
    loadContext.set(honoContext, ctx);

    return requestHandler(ctx.req.raw, loadContext);
  });

  const basename = import.meta.env.RESOLID_BASENAME;

  hono.route(basename, app);

  if (basename) {
    hono.route(`${basename}.data`, app);
  }

  return hono;
}
