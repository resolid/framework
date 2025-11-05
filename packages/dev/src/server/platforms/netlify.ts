import type { Context as NetlifyContext } from "@netlify/types";
import { handle } from "hono/netlify";
import { env } from "node:process";
import { createHonoServer, type HonoServerOptions } from "../utils";

type NetlifyEnv = {
  Bindings: {
    context: NetlifyContext;
  };
};

export type HonoNetlifyServerOptions = HonoServerOptions<NetlifyEnv>;

export type { NetlifyContext };

export async function createHonoNetlifyServer(
  options: HonoNetlifyServerOptions = {},
): Promise<(req: Request, context: NetlifyContext) => Response | Promise<Response>> {
  const mode = env.NODE_ENV == "test" ? "development" : env.NODE_ENV;

  const server = await createHonoServer<NetlifyEnv>(mode, options);

  return handle(server);
}
