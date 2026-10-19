import type { Context as NetlifyContext } from "@netlify/types";
import type { Context, Hono } from "hono";
import { clientIp } from "../middlewares/client-ip";
import { requestId } from "../middlewares/request-id";
import { requestOrigin } from "../middlewares/request-origin";
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
        clientIp((ctx: Context<NetlifyEnv>) => ctx.env.context.ip),
        requestId((ctx: Context<NetlifyEnv>) => ctx.env.context.requestId),
        requestOrigin((ctx: Context<NetlifyEnv>) => ctx.env.context.site.url),
      );

      await honoConfig?.(hono);
    },
    ...rest,
  });

  return handle(app);
}
