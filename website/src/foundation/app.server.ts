import { createDatabaseExtension } from "@resolid/app-db";
import { MySqlConnection, type MySqlDatabase } from "@resolid/app-db/adapters/mysql";
import { createLogExtension, type LoggerEntity, LogService } from "@resolid/app-log";
import { rotatingFileTarget } from "@resolid/app-log/targets";
import { createApp, loadProviders } from "@resolid/core";
import { attachDatabasePool } from "@vercel/functions";
import { env } from "node:process";

const inNode = import.meta.env.RESOLID_PLATFORM == "node";

export const app = await createApp({
  name: "resolid",
  extensions: [
    createLogExtension({
      targets: {
        ...(inNode && { app: (ctx) => rotatingFileTarget(ctx, "app") }),
      },
      loggers: [
        inNode && {
          category: "app",
          sinks: ["app"],
        },
      ].filter(Boolean) as LoggerEntity[],
    }),
    createDatabaseExtension<MySqlDatabase>({
      connection: new MySqlConnection({
        uri: env.RX_DB_URI,
        ssl: {
          rejectUnauthorized: true,
          ca: env.RX_DB_SSL_CA.replace(/\\n/gm, "\n"),
        },
        enhancer: (pool) => {
          if (import.meta.env.RESOLID_PLATFORM == "vercel") {
            attachDatabasePool(pool);
          }
        },
      }),
    }),
  ],
  providers: loadProviders(
    Object.values(
      import.meta.glob(["./**/repository.server.ts", "./**/service.server.ts"], {
        base: "../modules",
        import: "*",
        eager: true,
      }),
    ),
  ),
  expose: {
    logger: LogService,
  },
});

app.emitter.on("app:ready", () => {
  app.$.logger.category("app").info("Resolid application started.");
});
