import type { HttpBindings } from "@hono/node-server";
import type { HonoOptions } from "hono/hono-base";
import { type Context, type Env, Hono, type MiddlewareHandler } from "hono";
import { env } from "node:process";
import {
  createContext,
  createRequestHandler,
  type RequestHandler,
  type RouterContext,
  RouterContextProvider,
} from "react-router";

export const honoContext: RouterContext<Context> = createContext<Context>();

export type NodeEnv = {
  Bindings: HttpBindings;
};

export interface HonoServerOptions<E extends Env> {
  honoConfig?: (hono: Hono<E>) => void;
  honoOptions?: HonoOptions<E>;
}

export function resolveServerMode(): string | undefined {
  return env.NODE_ENV == "test" ? "development" : env.NODE_ENV;
}

export function createHonoServer<E extends Env>(
  mode: string | undefined,
  options: HonoServerOptions<E>,
): Hono<E> {
  const hono: Hono<E> = new Hono(options.honoOptions);

  if (options.honoConfig) {
    options.honoConfig(hono);
  }

  const app: Hono<E> = new Hono({
    strict: false,
  });

  const build = import("virtual:react-router/server-build");

  let requestHandler: Promise<RequestHandler> | undefined;

  app.use(async (ctx) => {
    requestHandler ??= build.then((serverBuild) => createRequestHandler(serverBuild, mode));

    const handleRequest = await requestHandler;

    const loadContext = new RouterContextProvider();
    loadContext.set(honoContext, ctx);

    return handleRequest(ctx.req.raw, loadContext);
  });

  const basename = import.meta.env.RESOLID_BASENAME;

  hono.route(basename, app);

  if (basename) {
    hono.route(`${basename}.data`, app);
  }

  return hono;
}

export function cacheControl(seconds: number, immutable = false): MiddlewareHandler {
  return async (ctx, next) => {
    if (!/\.[a-zA-Z0-9]+$/.test(ctx.req.path) || ctx.req.path.endsWith(".data")) {
      return next();
    }

    await next();

    if (!ctx.res.ok || ctx.res.headers.has("Cache-Control")) {
      return;
    }

    ctx.header("Cache-Control", `public, max-age=${seconds}${immutable ? ", immutable" : ""}`);
  };
}
