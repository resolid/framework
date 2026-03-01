import type { Hono, MiddlewareHandler } from "hono";
import type { AddressInfo } from "node:net";
import { serve, type ServerType } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { logger } from "hono/logger";
import { randomBytes } from "node:crypto";
import { networkInterfaces } from "node:os";
import { env } from "node:process";
import { type GetClientIpOptions, getRemoteAddr, getRequestOrigin } from "../utils/request";
import { createHonoServer, type HonoServerBaseOptions, type NodeEnv } from "../utils/server";

export type HonoNodeServerOptions = HonoServerBaseOptions<NodeEnv> & {
  port?: number;
  defaultLogger?: boolean;
  listeningListener?: (info: AddressInfo) => void;
  getClientIpOptions?: GetClientIpOptions;
};

export type HonoNodeServer = Hono<NodeEnv>;

export async function createHonoNodeServer(
  options: HonoNodeServerOptions = {},
): Promise<HonoNodeServer> {
  const mode = env.NODE_ENV == "test" ? "development" : env.NODE_ENV;
  const isProduction = mode == "production";

  const mergedOptions: HonoNodeServerOptions = {
    port: Number(env.PORT) || 3000,
    listeningListener: (info) => {
      console.log(`🚀 Server started on port ${info.port}`);

      const address = Object.values(networkInterfaces())
        .flat()
        .find((ip) => String(ip?.family).includes("4") && !ip?.internal)?.address;

      const servePath = env.SERVE_PATH ? env.SERVE_PATH : "";

      console.log(
        `[resolid] http://localhost:${info.port}${servePath}${address && ` (http://${address}:${info.port})`}`,
      );
    },
    ...options,
    defaultLogger: options.defaultLogger ?? !isProduction,
  };

  let server: ServerType | null = null;

  const hono = await createHonoServer(mode, {
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

      await mergedOptions.configure?.(hono);
    },
    honoOptions: mergedOptions.honoOptions,
    getLoadContext: mergedOptions.getLoadContext,
    onShutdown: async () => {
      server?.close();
      mergedOptions.onShutdown?.();
    },
    getClientIp: (ctx) =>
      getRemoteAddr(ctx.req.raw, ctx.env.incoming.socket, mergedOptions.getClientIpOptions),
    getRequestId: () => randomBytes(16).toString("hex"),
    getRequestOrigin: (ctx) =>
      getRequestOrigin(
        ctx.req.raw,
        ctx.env.incoming.socket,
        mergedOptions.getClientIpOptions?.proxy,
      ),
  });

  if (isProduction) {
    server = serve(
      {
        ...hono,
        port: mergedOptions.port,
      },
      mergedOptions.listeningListener,
    );
  }

  return hono;
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
