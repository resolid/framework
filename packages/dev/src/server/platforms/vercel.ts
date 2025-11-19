import { handle } from "@hono/node-server/vercel";
import type { IncomingMessage, ServerResponse } from "http";
import type { Http2ServerRequest, Http2ServerResponse } from "http2";
import { env } from "node:process";
import { createHonoServer, type HonoServerOptions, type NodeEnv } from "../utils";

export type HonoVercelServerOptions = HonoServerOptions<NodeEnv>;

export const createHonoVercelServer = async (
  options: HonoVercelServerOptions = {},
): Promise<
  (
    incoming: IncomingMessage | Http2ServerRequest,
    outgoing: ServerResponse | Http2ServerResponse,
  ) => Promise<void>
> => {
  const mode = env.NODE_ENV == "test" ? "development" : env.NODE_ENV;

  const server = await createHonoServer<NodeEnv>(mode, options);

  return handle(server);
};
