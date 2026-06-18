import type { Context as NetlifyContext } from "@netlify/types";
import type { Context } from "hono";
import { handle } from "hono/netlify";
import { env } from "node:process";
import { clientIp } from "../middlewares/client-ip";
import { requestId } from "../middlewares/request-id";
import { requestOrigin } from "../middlewares/request-origin";
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

  const { configure, ...rest } = options;

  const app = await createHonoServer<NetlifyEnv>(mode, {
    configure: async (hono) => {
      hono.use(
        clientIp((ctx: Context<NetlifyEnv>) => ctx.env.context.ip),
        requestId((ctx: Context<NetlifyEnv>) => ctx.env.context.requestId),
        requestOrigin((ctx: Context<NetlifyEnv>) => ctx.env.context.site.url),
      );

      await configure?.(hono);
    },
    ...rest,
  });

  return handle(app);
}
