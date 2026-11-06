import type { Context as NetlifyContext } from "@netlify/types";
import type { Context } from "hono";
import { requestId } from "../middlewares/request-id";
import { requestInfo } from "../middlewares/request-info";
import { createHonoServer, type HonoServerOptions, resolveServerMode } from "../utils/server";

export type NetlifyEnv = {
  Bindings: {
    context: NetlifyContext;
  };
};

export type HonoNetlifyServerOptions = HonoServerOptions<NetlifyEnv>;

export function createHonoNetlifyServer(
  options: HonoNetlifyServerOptions,
): (req: Request, context: NetlifyContext) => Response | Promise<Response> {
  const mode = resolveServerMode();

  const { honoConfig, ...rest } = options;

  const app = createHonoServer<NetlifyEnv>(mode, {
    honoConfig: async (hono) => {
      hono.use(
        requestId((ctx: Context<NetlifyEnv>) => ctx.env.context.requestId),
        requestInfo((ctx: Context<NetlifyEnv>) => ({
          remoteAddr: ctx.env.context.ip,
          publicOrigin: ctx.env.context.site.url ?? new URL(ctx.req.url).origin,
        })),
      );

      honoConfig?.(hono);
    },
    ...rest,
  });

  return (req: Request, context: NetlifyContext) => {
    return app.fetch(req, { context });
  };
}
