import { createServer, netlifyConfig, nodeConfig, vercelConfig } from "@resolid/dev/server";
import { env } from "node:process";
import { app } from "~/app";

await app.run();

export default await createServer((platform) => {
  const onShutdown = async () => {
    await app.dispose();
  };

  switch (platform) {
    case "vercel":
      return vercelConfig({ onShutdown });

    case "netlify":
      return netlifyConfig({ onShutdown });

    default:
      return nodeConfig({ port: env.SERVER_PORT, onShutdown });
  }
});
