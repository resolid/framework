import {
  type RouterContextProvider,
  createHonoNetlifyServer,
  createHonoNodeServer,
  createHonoVercelServer,
} from "@resolid/dev/http.server";
import { env } from "node:process";
import { app } from "~/foundation/app.server";
import { appContext } from "~/foundation/context.server";

await app.run();

const configureLoadContext = (loadContext: RouterContextProvider) => {
  loadContext.set(appContext, app);
};

export default import.meta.env.RESOLID_PLATFORM == "netlify"
  ? await createHonoNetlifyServer({
      configureLoadContext,
    })
  : import.meta.env.RESOLID_PLATFORM == "vercel"
    ? await createHonoVercelServer({
        configureLoadContext,
      })
    : await createHonoNodeServer({
        port: env.SERVER_PORT,
        configureLoadContext,
        onShutdown: async () => {
          await app.dispose();
        },
      });
