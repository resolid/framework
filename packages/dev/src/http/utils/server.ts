import type { Http2Bindings, HttpBindings } from "@hono/node-server";
import type { HonoOptions } from "hono/hono-base";
import type { BlankEnv } from "hono/types";
import { type Context, type Env, Hono } from "hono";
import { requestId } from "hono/request-id";
import process from "node:process";
import {
  type AppLoadContext,
  createRequestHandler,
  RouterContextProvider,
  type ServerBuild,
} from "react-router";
import { clientIp, clientIpContext } from "../middlewares/client-ip";
import { requestIdContext } from "../middlewares/request-id";
import { requestOrigin, requestOriginContext } from "../middlewares/request-origin";

export type PlatformConfig<T> = (config: T | undefined) => T | undefined;

export interface NodeEnv {
  Bindings: HttpBindings | Http2Bindings;
}

export interface HonoServerBaseOptions<E extends Env = BlankEnv> {
  configure?: <E extends Env = BlankEnv>(app: Hono<E>) => Promise<void> | void;
  honoOptions?: HonoOptions<E>;
  onShutdown?: () => Promise<void> | void;
  getLoadContext?: (
    context: Context<E>,
    options: {
      build: ServerBuild;
      mode?: string;
    },
  ) => Promise<RouterContextProvider> | RouterContextProvider;
}

type HonoServerOptions<E extends Env = BlankEnv> = HonoServerBaseOptions<E> & {
  getClientIp: (ctx: Context<E>) => string;
  getRequestId: (ctx: Context<E>) => string;
  getRequestOrigin: (ctx: Context<E>) => string | undefined;
};

export async function createHonoServer<E extends Env = BlankEnv>(
  mode: string | undefined,
  options: HonoServerOptions<E>,
): Promise<Hono<E>> {
  const hono = new Hono<E>(options.honoOptions);

  const build = (await import(
    // @ts-expect-error - Virtual module provided by React Router at build time
    "virtual:react-router/server-build"
  )) as ServerBuild;

  hono.use(
    "*",
    clientIp(options.getClientIp),
    requestId({ generator: options.getRequestId }),
    requestOrigin(options.getRequestOrigin),
  );

  if (options.configure) {
    await options.configure(hono);
  }

  hono.use("*", async (c) => {
    return (async (ctx) => {
      const getLoadContext = options.getLoadContext?.(ctx, { build, mode });

      const loadContext =
        (getLoadContext instanceof Promise ? await getLoadContext : getLoadContext) ??
        new RouterContextProvider();

      loadContext.set(clientIpContext, ctx.get("clientIp"));
      loadContext.set(requestIdContext, ctx.get("requestId"));
      loadContext.set(requestOriginContext, ctx.get("requestOrigin"));

      return createRequestHandler(build, mode)(
        ctx.req.raw,
        loadContext as unknown as AppLoadContext,
      );
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

  return hono;
}
