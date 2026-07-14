import type { Hono } from "hono";
import { env } from "node:process";
import { clientIp } from "../middlewares/client-ip";
import { requestId } from "../middlewares/request-id";
import { requestOrigin } from "../middlewares/request-origin";
import { createHonoServer, type HonoServerOptions, type NodeEnv } from "../utils/server";

export type HonoVercelServerOptions = HonoServerOptions<NodeEnv>;

export async function createHonoVercelServer(
  options: HonoVercelServerOptions = {},
): Promise<Hono<NodeEnv>> {
  const mode = env.NODE_ENV == "test" ? "development" : env.NODE_ENV;

  const { honoConfig, ...rest } = options;

  return await createHonoServer<NodeEnv>(mode, {
    honoConfig: async (hono) => {
      hono.use(
        clientIp((ctx) => ctx.req.raw.headers.get("x-real-ip") ?? ""),
        requestId((ctx) => ctx.req.raw.headers.get("x-vercel-id") ?? ""),
        requestOrigin(() => `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`),
      );

      await honoConfig?.(hono);
    },
    ...rest,
  });
}
