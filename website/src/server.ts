import { handle } from "@hono/netlify";
import {
  createHonoNetlifyServer,
  createHonoNodeServer,
  createHonoVercelServer,
  type Env,
  type Hono,
} from "@resolid/dev/http.server";
import { env } from "node:process";
import { type App, app } from "~/foundation/app.server";

await app.run();

declare module "@resolid/dev/env" {
  interface AppVariableMap {
    app: App;
  }
}

function honoConfig<E extends Env>(hono: Hono<E>) {
  hono.use(async (ctx, next) => {
    ctx.set("app", app);
    await next();
  });
}

export default import.meta.env.RESOLID_PLATFORM == "netlify"
  ? await createHonoNetlifyServer({
      handle,
      honoConfig,
    })
  : import.meta.env.RESOLID_PLATFORM == "vercel"
    ? await createHonoVercelServer({
        honoConfig,
      })
    : await createHonoNodeServer({
        port: env.SERVER_PORT,
        honoConfig,
        async onShutdown() {
          await app.dispose();
        },
      });
