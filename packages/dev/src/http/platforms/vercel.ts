import type { Hono } from "hono";
import { env } from "node:process";
import { remoteAddr } from "../middlewares/remote-addr";
import { requestId } from "../middlewares/request-id";
import { requestOrigin } from "../middlewares/request-origin";
import {
  createHonoServer,
  type HonoServerOptions,
  type NodeEnv,
  resolveServerMode,
} from "../utils/server";

export type HonoVercelServerOptions = HonoServerOptions<NodeEnv>;

export async function createHonoVercelServer(
  options: HonoVercelServerOptions = {},
): Promise<Hono<NodeEnv>> {
  const mode = resolveServerMode();

  const { honoConfig, ...rest } = options;

  return await createHonoServer<NodeEnv>(mode, {
    honoConfig: async (hono) => {
      hono.use(
        remoteAddr((ctx) => ctx.req.raw.headers.get("x-real-ip") ?? ""),
        requestId((ctx) => ctx.req.raw.headers.get("x-vercel-id") ?? ""),
        requestOrigin(() => `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`),
      );

      await honoConfig?.(hono);
    },
    ...rest,
  });
}
