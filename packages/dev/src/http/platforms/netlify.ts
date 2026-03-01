import type { Context as NetlifyContext } from "@netlify/types";
import { handle } from "hono/netlify";
import { env } from "node:process";
import { createHonoServer, type HonoServerBaseOptions } from "../utils/server";

interface NetlifyEnv {
  Bindings: {
    context: NetlifyContext;
  };
}

export type HonoNetlifyServerOptions = HonoServerBaseOptions<NetlifyEnv>;

export type HonoNetlifyServer = (
  req: Request,
  context: NetlifyContext,
) => Response | Promise<Response>;

export async function createHonoNetlifyServer(
  options: HonoNetlifyServerOptions = {},
): Promise<HonoNetlifyServer> {
  const mode = env.NODE_ENV == "test" ? "development" : env.NODE_ENV;

  const hono = await createHonoServer<NetlifyEnv>(mode, {
    ...options,
    getClientIp: (ctx) => ctx.env.context.ip,
    getRequestId: (ctx) => ctx.env.context.requestId,
    getRequestOrigin: (ctx) => ctx.env.context.site.url,
  });

  return handle(hono);
}
