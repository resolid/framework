import { createServer, netlifyConfig, nodeConfig, vercelConfig } from "@resolid/dev/server";
import type { LogService } from "@resolid/log";
import { env } from "node:process";
import { app, context, DI_LOG_KEY } from "./app";

await app.run();

const logger = await context.resolve<LogService>(DI_LOG_KEY);

logger.info("Reslid is started!");

// noinspection JSUnusedGlobalSymbols
export default await createServer((platform) => {
  switch (platform) {
    case "vercel":
      return vercelConfig(undefined);

    case "netlify":
      return netlifyConfig(undefined);

    default:
      return nodeConfig({ port: env.SERVER_PORT });
  }
});
