import {
  createHonoNetlifyServer,
  createHonoNodeServer,
  createHonoVercelServer,
} from "@resolid/dev/http.server";
import { env } from "node:process";
import { app } from "~/app";

await app.run();

async function onShutdown() {
  await app.dispose();
}
export default await (import.meta.env.RESOLID_PLATFORM == "netlify"
  ? createHonoNetlifyServer()
  : import.meta.env.RESOLID_PLATFORM == "vercel"
    ? createHonoVercelServer()
    : createHonoNodeServer({
        onShutdown,
        getClientIpOptions: { proxy: env.RX_PROXY == 1, proxyCount: env.RX_PROXY_COUNT },
      }));
