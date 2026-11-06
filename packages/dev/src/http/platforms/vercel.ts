import type { Hono } from "hono";
import { env } from "node:process";
import { requestId } from "../middlewares/request-id";
import { requestInfo } from "../middlewares/request-info";
import {
  createHonoServer,
  type HonoServerOptions,
  type NodeEnv,
  resolveServerMode,
} from "../utils/server";

export type HonoVercelServerOptions = HonoServerOptions<NodeEnv>;

export function createHonoVercelServer(options: HonoVercelServerOptions = {}): Hono<NodeEnv> {
  const mode = resolveServerMode();

  const { honoConfig, ...rest } = options;

  return createHonoServer<NodeEnv>(mode, {
    honoConfig: async (hono) => {
      hono.use(
        requestId((ctx) => ctx.req.raw.headers.get("x-vercel-id") ?? ""),
        requestInfo((ctx) => ({
          remoteAddr: ctx.req.raw.headers.get("x-real-ip") ?? "",
          publicOrigin: `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`,
        })),
      );

      honoConfig?.(hono);
    },
    ...rest,
  });
}
