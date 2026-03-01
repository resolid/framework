import type { IncomingMessage, ServerResponse } from "http";
import type { Http2ServerRequest, Http2ServerResponse } from "http2";
import { handle } from "@hono/node-server/vercel";
import { env } from "node:process";
import { createHonoServer, type HonoServerBaseOptions, type NodeEnv } from "../utils/server";

export type HonoVercelServerOptions = HonoServerBaseOptions<NodeEnv>;

export type HonoVercelServer = (
  incoming: IncomingMessage | Http2ServerRequest,
  outgoing: ServerResponse | Http2ServerResponse,
) => Promise<void>;

export const createHonoVercelServer = async (
  options: HonoVercelServerOptions = {},
): Promise<HonoVercelServer> => {
  const mode = env.NODE_ENV == "test" ? "development" : env.NODE_ENV;

  const hono = await createHonoServer<NodeEnv>(mode, {
    ...options,
    getClientIp: (ctx) => ctx.req.raw.headers.get("x-real-ip") ?? "",
    getRequestId: (ctx) => ctx.req.raw.headers.get("x-vercel-id") ?? "",
    getRequestOrigin: () => `https://${env["VERCEL_PROJECT_PRODUCTION_URL"]}`,
  });

  return handle(hono);
};
