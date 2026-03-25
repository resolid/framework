import type { IncomingMessage, ServerResponse } from "http";
import type { Http2ServerRequest, Http2ServerResponse } from "http2";
import { handle } from "@hono/node-server/vercel";
import { env } from "node:process";
import type { ClientIpGetter } from "../middlewares/client-ip";
import type { RequestIdGenerator } from "../middlewares/request-id";
import type { RequestOriginGetter } from "../middlewares/request-origin";
import { createHonoServer, type HonoServerOptions, type NodeEnv } from "../utils/server";

export type HonoVercelServerOptions = HonoServerOptions<NodeEnv>;

export type HonoVercelServer = (
  incoming: IncomingMessage | Http2ServerRequest,
  outgoing: ServerResponse | Http2ServerResponse,
) => Promise<void>;

export const createHonoVercelServer = async (
  options: HonoVercelServerOptions = {},
): Promise<HonoVercelServer> => {
  const mode = env.NODE_ENV == "test" ? "development" : env.NODE_ENV;

  const app = await createHonoServer<NodeEnv>(mode, {
    ...options,
  });

  return handle(app);
};

export function vercelClientIpGetter(): ClientIpGetter {
  return (ctx) => ctx.req.raw.headers.get("x-real-ip") ?? "";
}

export function vercelRequestIdGenerator(): RequestIdGenerator {
  return (ctx) => ctx.req.raw.headers.get("x-vercel-id") ?? "";
}

export function vercelRequestOriginGetter(): RequestOriginGetter {
  return () => `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
}
