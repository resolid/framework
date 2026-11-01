import type { Context as NetlifyContext } from "@netlify/types";
import type { Context, Hono } from "hono";
import { requestId } from "../middlewares/request-id";
import { requestInfo } from "../middlewares/request-info";
import { createHonoServer, type HonoServerOptions, resolveServerMode } from "../utils/server";

export type NetlifyEnv = {
  Bindings: {
    context: NetlifyContext;
  };
};

type NetlifyHandle = (req: Request, context: NetlifyContext) => Response | Promise<Response>;

export type HonoNetlifyServerOptions = HonoServerOptions<NetlifyEnv> & {
  handle: (app: Hono<NetlifyEnv>) => NetlifyHandle;
};

export async function createHonoNetlifyServer(
  options: HonoNetlifyServerOptions,
): Promise<NetlifyHandle> {
  const mode = resolveServerMode();

  const { handle, honoConfig, ...rest } = options;

  const app = await createHonoServer<NetlifyEnv>(mode, {
    honoConfig: async (hono) => {
      hono.use(
        requestId((ctx: Context<NetlifyEnv>) => ctx.env.context.requestId),
        requestInfo((ctx: Context<NetlifyEnv>) => ({
          remoteAddr: ctx.env.context.ip,
          publicOrigin: ctx.env.context.site.url ?? new URL(ctx.req.url).origin,
        })),
      );

      await honoConfig?.(hono);
    },
    ...rest,
  });

  return handle(app);
}
