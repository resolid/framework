import type { Context as NetlifyContext } from "@netlify/types";
import type { Context } from "hono";
import { handle } from "hono/netlify";
import { env } from "node:process";
import type { ClientIpGetter } from "../middlewares/client-ip";
import type { RequestIdGenerator } from "../middlewares/request-id";
import type { RequestOriginGetter } from "../middlewares/request-origin";
import { createHonoServer, type HonoServerOptions } from "../utils/server";

export type NetlifyEnv = {
  Bindings: {
    context: NetlifyContext;
  };
};

export type HonoNetlifyServerOptions = HonoServerOptions<NetlifyEnv>;

export type HonoNetlifyServer = (
  req: Request,
  context: NetlifyContext,
) => Response | Promise<Response>;

export async function createHonoNetlifyServer(
  options: HonoNetlifyServerOptions = {},
): Promise<HonoNetlifyServer> {
  const mode = env.NODE_ENV == "test" ? "development" : env.NODE_ENV;

  const app = await createHonoServer<NetlifyEnv>(mode, {
    ...options,
  });

  return handle(app);
}

export function netlifyClientIpGetter(): ClientIpGetter {
  return (ctx: Context<NetlifyEnv>) => ctx.env.context.ip;
}

export function netlifyRequestIdGenerator(): RequestIdGenerator {
  return (ctx: Context<NetlifyEnv>) => ctx.env.context.requestId;
}

export function netlifyRequestOriginGetter(): RequestOriginGetter {
  return (ctx: Context<NetlifyEnv>) => ctx.env.context.site.url;
}
