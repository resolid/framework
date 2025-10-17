import type { HonoContext, NodeEnv } from "@resolid/react-router-hono";
import {
  createHonoNetlifyServer,
  type HonoNetlifyServerOptions,
  type NetlifyContext,
} from "@resolid/react-router-hono/netlify-server";
import { createHonoNodeServer, type HonoNodeServerOptions } from "@resolid/react-router-hono/node-server";
import { createHonoVercelServer, type HonoVercelServerOptions } from "@resolid/react-router-hono/vercel-server";
import type { Hono } from "hono";
import type { IncomingMessage, ServerResponse } from "http";
import type { Http2ServerRequest, Http2ServerResponse } from "http2";
import type { Platform } from "../types";

export type { Hono, HonoContext, NetlifyContext, NodeEnv };

type PlatformConfig<T> = (config: T | undefined) => T | undefined;

export const nodeConfig: PlatformConfig<HonoNodeServerOptions> = (config) => config;

export const netlifyConfig: PlatformConfig<HonoNetlifyServerOptions> = (config) => config;

export const vercelConfig: PlatformConfig<HonoVercelServerOptions> = (config) => config;

export const createServer = async (
  factory: (
    platform: Platform["platform"],
  ) => HonoNodeServerOptions | HonoNetlifyServerOptions | HonoVercelServerOptions | undefined,
): Promise<
  | ((req: Request, context: NetlifyContext) => Response | Promise<Response>)
  | ((incoming: IncomingMessage | Http2ServerRequest, outgoing: ServerResponse | Http2ServerResponse) => Promise<void>)
  | Hono<NodeEnv>
> => {
  const platform = import.meta.env.RESOLID_PLATFORM as Platform["platform"];

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
