import {
  createHonoNetlifyServer,
  createHonoNodeServer,
  createHonoVercelServer,
} from "@resolid/dev/http.server";
import { env } from "node:process";
import { RouterContextProvider } from "react-router";
import { app } from "~/foundation/app.server";
import { configure } from "~/foundation/hono.server";
import { platform } from "~/foundation/platform.server";

await app.run();

const getLoadContext = () => {
  const context = new RouterContextProvider();
  Object.assign(context, { app });

  return context;
};

type AppContext = {
  app: typeof app;
};

declare module "react-router" {
  // oxlint-disable-next-line typescript/no-empty-object-type
  interface RouterContextProvider extends AppContext {}
}

export default platform == "netlify"
  ? await createHonoNetlifyServer({
      configure,
      getLoadContext,
    })
  : platform == "vercel"
    ? await createHonoVercelServer({
        configure,
        getLoadContext,
      })
    : await createHonoNodeServer({
        port: env.SERVER_PORT,
        configure,
        getLoadContext,
        onShutdown: async () => {
          await app.dispose();
        },
      });
