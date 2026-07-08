import { createCacheExtension, MemoryCache } from "@resolid/app-cache";
import { createDatabaseExtension } from "@resolid/app-db";
import { MySqlConnection, type MySqlDatabase } from "@resolid/app-db/adapters/mysql";
import { createLogExtension, type LoggerEntity, LogService } from "@resolid/app-log";
import { rotatingFileTarget } from "@resolid/app-log/targets";
import { createMailExtension, createMailTransport } from "@resolid/app-mail";
import { FileCache } from "@resolid/cache-file";
import { RedisCache } from "@resolid/cache-redis";
import { createApp, loadProviders } from "@resolid/core";
import { __DEV__ } from "@resolid/utils";
import { env } from "node:process";

const inNode = import.meta.env.RESOLID_PLATFORM == "node";
const inVercel = import.meta.env.RESOLID_PLATFORM == "vercel";

const attachDatabasePool = inVercel
  ? (({ attachDatabasePool }) => attachDatabasePool)(await import("@vercel/functions"))
  : undefined;

export const app = await createApp({
  name: "Resolid",
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
    createCacheExtension({
      store: inNode
        ? (ctx) => new FileCache(ctx.runtimePath("cache"))
        : inVercel
          ? new RedisCache(env.RX_CACHE_REDIS)
          : new MemoryCache(),
    }),
    createDatabaseExtension<MySqlDatabase>({
      connection: new MySqlConnection(
        {
          uri: env.RX_DB_URI,
          ssl: {
            rejectUnauthorized: true,
            ca: env.RX_DB_SSL_CA.replaceAll(/\\n/gm, "\n"),
          },
        },
        attachDatabasePool,
      ),
      drizzleConfig: {
        logger: __DEV__,
      },
    }),
    createMailExtension({
      from: env.RX_MAIL_FROM,
      transporters: {
        smtp: createMailTransport({
          pool: true,
          host: env.RX_MAIL_HOST,
          port: env.RX_MAIL_PORT,
          auth: {
            user: env.RX_MAIL_USER,
            pass: env.RX_MAIL_PASSWORD,
          },
        }),
      },
      defaultTransport: "smtp",
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

export type App = typeof app;

app.emitter.on("app:ready", (ctx) => {
  app.$.logger.category("app").info(`${ctx.name} application started.`);
});
