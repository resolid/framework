import type { Context, Hono, MiddlewareHandler } from "hono";
import type { AddressInfo } from "node:net";
import { serve, type ServerType } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { logger } from "hono/logger";
import { networkInterfaces } from "node:os";
import { env } from "node:process";
import { requestId } from "../middlewares/request-id";
import { requestInfo } from "../middlewares/request-info";
import { getRequestInfo, type TrustProxy } from "../utils/forwarded";
import {
  createHonoServer,
  type HonoServerOptions,
  type NodeEnv,
  resolveServerMode,
} from "../utils/server";

export type { NodeEnv } from "../utils/server";

export type HonoNodeServerOptions = HonoServerOptions<NodeEnv> & {
  port?: number;
  hostname?: string;
  trustProxy?: TrustProxy;
  defaultLogger?: boolean;
  listeningListener?: (info: AddressInfo) => void;
  onShutdown?: () => Promise<void> | void;
};

export function createHonoNodeServer(options: HonoNodeServerOptions = {}): Hono<NodeEnv> {
  const mode = resolveServerMode();
  const isProduction = mode == "production";
  const basename = import.meta.env.RESOLID_BASENAME;

  const { port, defaultLogger, trustProxy = false, onShutdown, ...restOptions } = options;

  const mergedOptions: HonoNodeServerOptions & { port: number } = {
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

  const app = createHonoServer(mode, {
    honoConfig: async (hono) => {
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
        requestId(),
        requestInfo((ctx: Context<NodeEnv>) => {
          return getRequestInfo(
            trustProxy,
            ctx.env.incoming.socket.remoteAddress,
            ctx.req.url,
            ctx.req.raw.headers,
          );
        }),
      );

      mergedOptions.honoConfig?.(hono);
    },
    honoOptions: mergedOptions.honoOptions,
  });

  const shouldStartServer = isProduction && env.IS_RR_BUILD_REQUEST !== "yes";

  if (shouldStartServer) {
    const server = serve(
      {
        fetch: app.fetch,
        port: mergedOptions.port,
        hostname: mergedOptions.hostname,
      },
      mergedOptions.listeningListener,
    );

    gracefulShutdown(server, { onShutdown });
  }

  return app;
}

type GracefulShutdownOptions = {
  timeout?: number;
  onShutdown?: () => void | Promise<void>;
};

function gracefulShutdown(
  server: ServerType,
  { timeout = 10000, onShutdown }: GracefulShutdownOptions = {},
) {
  let closing = false;

  function shutdown() {
    if (closing) {
      return;
    }

    closing = true;

    const timer = setTimeout(() => {
      console.error("[resolid] Shutdown timed out, forcing exit.");

      if ("closeAllConnections" in server) {
        server.closeAllConnections();
      }

      process.exit(1);
    }, timeout).unref();

    server.close(async (err) => {
      let exitCode = 0;

      if (err) {
        console.error("[resolid] Failed to shut down server:", err);
        exitCode = 1;
      }

      try {
        await onShutdown?.();
      } catch (e) {
        console.error("[resolid] onShutdown failed:", e);
        exitCode = 1;
      }

      if (exitCode === 0) {
        console.log("[resolid] Server shut down.");
      }

      clearTimeout(timer);
      process.exitCode = exitCode;
    });

    if ("closeIdleConnections" in server) {
      server.closeIdleConnections();
    }
  }

  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    globalThis.process.on(sig, shutdown);
  }
}

export function cacheControl(seconds: number, immutable = false): MiddlewareHandler {
  return async (c, next) => {
    if (!/\.[a-zA-Z0-9]+$/.test(c.req.path) || c.req.path.endsWith(".data")) {
      return next();
    }

    await next();

    if (!c.res.ok) {
      return;
    }

    c.header("Cache-Control", `public, max-age=${seconds}${immutable ? ", immutable" : ""}`);
  };
}
