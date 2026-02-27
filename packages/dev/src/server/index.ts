import type { Hono, Context as HonoContext } from "hono";
import type { IncomingMessage, ServerResponse } from "http";
import type { Http2ServerRequest, Http2ServerResponse } from "http2";
import type { Platform } from "../types";
import type { NodeEnv } from "./utils";
import {
  createHonoNetlifyServer,
  type HonoNetlifyServerOptions,
  type NetlifyContext,
} from "./platforms/netlify";
import { cache, createHonoNodeServer, type HonoNodeServerOptions } from "./platforms/node";
import { createHonoVercelServer, type HonoVercelServerOptions } from "./platforms/vercel";

export type { Hono, HonoContext, NetlifyContext, NodeEnv, Platform };

type PlatformConfig<T> = (config: T | undefined) => T | undefined;

export const cacheControl: typeof cache = cache;

export const nodeConfig: PlatformConfig<HonoNodeServerOptions> = (config) => config;

export const netlifyConfig: PlatformConfig<HonoNetlifyServerOptions> = (config) => config;

export const vercelConfig: PlatformConfig<HonoVercelServerOptions> = (config) => config;

export const createServer = async (
  factory: (
    platform: Platform,
  ) => HonoNodeServerOptions | HonoNetlifyServerOptions | HonoVercelServerOptions | undefined,
): Promise<
  | ((req: Request, context: NetlifyContext) => Response | Promise<Response>)
  | ((
      incoming: IncomingMessage | Http2ServerRequest,
      outgoing: ServerResponse | Http2ServerResponse,
    ) => Promise<void>)
  | Hono<NodeEnv>
> => {
  const platform = import.meta.env.RESOLID_PLATFORM;

  switch (platform) {
    case "netlify": {
      return await createHonoNetlifyServer(factory("netlify") as HonoNetlifyServerOptions);
    }

    case "vercel": {
      return await createHonoVercelServer(factory("vercel") as HonoVercelServerOptions);
    }

    default: {
      return await createHonoNodeServer(factory("node") as HonoNodeServerOptions);
    }
  }
};
