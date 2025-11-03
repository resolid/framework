import { createServer, netlifyConfig, nodeConfig, vercelConfig } from "@resolid/dev/server";
import { env } from "node:process";
import { app } from "~/app";

await app.run();

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
