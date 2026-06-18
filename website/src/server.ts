import {
  type Context,
  createHonoNetlifyServer,
  createHonoNodeServer,
  createHonoVercelServer,
} from "@resolid/dev/http.server";
import { env } from "node:process";
import { RouterContextProvider } from "react-router";
import { app } from "~/foundation/app.server";
import { appContext, honoContext } from "~/foundation/context.server";

await app.run();

const getLoadContext = (ctx: Context) => {
  const context = new RouterContextProvider();
  context.set(appContext, app);
  context.set(honoContext, ctx);

  return context;
};

export default import.meta.env.RESOLID_PLATFORM == "netlify"
  ? await createHonoNetlifyServer({
      getLoadContext,
    })
  : import.meta.env.RESOLID_PLATFORM == "vercel"
    ? await createHonoVercelServer({
        getLoadContext,
      })
    : await createHonoNodeServer({
        port: env.SERVER_PORT,
        getLoadContext,
        onShutdown: async () => {
          await app.dispose();
        },
      });
