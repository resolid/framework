import {
  createHonoNetlifyServer,
  createHonoNodeServer,
  createHonoVercelServer,
  type MiddlewareHandler,
} from "@resolid/dev/http.server";
import { env } from "node:process";
import { type App, app } from "~/foundation/app.server";

await app.run();

declare module "@resolid/dev/env" {
  interface AppVariableMap {
    app: App;
  }
}

function appMiddleware(): MiddlewareHandler {
  return async (ctx, next) => {
    ctx.set("app", app);

    await next();
  };
}

export default import.meta.env.RESOLID_PLATFORM == "netlify"
  ? await createHonoNetlifyServer({
      honoConfig(hono) {
        hono.use(appMiddleware());
      },
    })
  : import.meta.env.RESOLID_PLATFORM == "vercel"
    ? await createHonoVercelServer({
        honoConfig(hono) {
          hono.use(appMiddleware());
        },
      })
    : await createHonoNodeServer({
        port: env.SERVER_PORT,
        honoConfig(hono) {
          hono.use(appMiddleware());
        },
        async onShutdown() {
          await app.dispose();
        },
      });
