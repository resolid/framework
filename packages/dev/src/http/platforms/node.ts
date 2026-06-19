import type { Context, Hono, MiddlewareHandler } from "hono";
import type { AddressInfo } from "node:net";
import { serve, type ServerType } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { logger } from "hono/logger";
import { networkInterfaces } from "node:os";
import { env } from "node:process";
import { clientIp } from "../middlewares/client-ip";
import { requestId } from "../middlewares/request-id";
import { requestOrigin } from "../middlewares/request-origin";
import { getRemoteAddr, getRequestOrigin } from "../utils/request";
import { createHonoServer, type HonoServerOptions, type NodeEnv } from "../utils/server";

export type { NodeEnv };

export type HonoNodeServerOptions = HonoServerOptions<NodeEnv> & {
  port?: number;
  defaultLogger?: boolean;
  listeningListener?: (info: AddressInfo) => void;
  onShutdown?: () => Promise<void> | void;
  proxy?: boolean;
  proxyCount?: number;
  ipHeaders?: string;
};

export type HonoNodeServer = Hono<NodeEnv>;

export async function createHonoNodeServer(
  options: HonoNodeServerOptions = {},
): Promise<HonoNodeServer> {
  const mode = env.NODE_ENV == "test" ? "development" : env.NODE_ENV;
  const isProduction = mode == "production";
  const basename = import.meta.env.RESOLID_BASENAME;

  const { port, defaultLogger, proxy, proxyCount, ipHeaders, ...restOptions } = options;

  const mergedOptions: HonoNodeServerOptions = {
    port: port ?? 3000,
    listeningListener: (info) => {
      console.log(`🚀 Server started on port ${info.port}`);

      const address = Object.values(networkInterfaces())
        .flat()
        .find((ip) => String(ip?.family).includes("4") && !ip?.internal)?.address;

      console.log(
        `[resolid] http://localhost:${info.port}${basename}${env.SERVER_PATH ?? ""}${address && ` (http://${address}:${info.port})`}`,
      );
    },
    defaultLogger: defaultLogger ?? !isProduction,
    ...restOptions,
  };

  let server: ServerType | null = null;

  const app = await createHonoServer(mode, {
    configure: async (hono) => {
      if (isProduction) {
        const clientBuildPath = `${import.meta.env.RESOLID_BUILD_DIR}/client`;

        hono.use(
          `/${import.meta.env.RESOLID_ASSETS_DIR}/*`,
          cacheControl(60 * 60 * 24 * 365, true),
          serveStatic({ root: clientBuildPath }),
        );
        hono.use("*", cacheControl(60 * 60), serveStatic({ root: clientBuildPath }));
      } else {
        hono.use("*", cacheControl(60 * 60), serveStatic({ root: "./public" }));
      }

      if (mergedOptions.defaultLogger) {
        hono.use("*", logger());
      }

      hono.use(
        clientIp((ctx: Context<NodeEnv>) =>
          getRemoteAddr(ctx.req.raw, ctx.env.incoming.socket, { proxy, proxyCount, ipHeaders }),
        ),
        requestId(),
        requestOrigin((ctx: Context<NodeEnv>) =>
          getRequestOrigin(ctx.req.raw, ctx.env.incoming.socket, proxy),
        ),
      );

      await mergedOptions.configure?.(hono);
    },
    honoOptions: mergedOptions.honoOptions,
    configureLoadContext: mergedOptions.configureLoadContext,
  });

  if (isProduction) {
    server = serve(
      {
        fetch: app.fetch,
        port: mergedOptions.port,
      },
      mergedOptions.listeningListener,
    );
  }

  async function shutdown() {
    server?.close();
    await mergedOptions.onShutdown?.();

    process.removeListener("SIGINT", shutdown);
    process.removeListener("SIGTERM", shutdown);

    console.log("[resolid] Node server shutdown.");

    process.exit(0);
  }

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // @ts-expect-error hot
  if (import.meta.hot) {
    process.removeListener("SIGINT", shutdown);
    process.removeListener("SIGTERM", shutdown);
  }

  return app;
}

export function cacheControl(seconds: number, immutable = false): MiddlewareHandler {
  return async (c, next) => {
    if (!c.req.path.match(/\.[a-zA-Z0-9]+$/) || c.req.path.endsWith(".data")) {
      return next();
    }

    await next();

    if (!c.res.ok) {
      return;
    }

    c.header("Cache-Control", `public, max-age=${seconds}${immutable ? ", immutable" : ""}`);
  };
}
