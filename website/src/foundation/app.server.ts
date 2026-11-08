import { createApp, resolveProviders, type ProviderModule } from "@resolid/app";
import { createCacheExtension } from "@resolid/app-cache";
import { createDatabaseExtension } from "@resolid/app-db";
import { MySqlConnection } from "@resolid/app-db/adapters/mysql";
import { createLogExtension, LogService } from "@resolid/app-log";
import { rotatingFileTarget } from "@resolid/app-log/targets";
import { MailService, createMailExtension, createMailTransport } from "@resolid/app-mail";
import { FileCache } from "@resolid/cache-file";
import { __DEV__ } from "@resolid/utils";
import { env } from "node:process";

const injectableModules =
  import.meta.env.RESOLID_LOADER == "vite"
    ? Object.values(
        import.meta.glob<ProviderModule>(
          ["./**/repository.server.ts", "./**/service.server.ts", "./**/*.service.server.ts"],
          {
            base: "../modules",
            import: "*",
            eager: true,
          },
        ),
      )
    : [];

export const app = await createApp({
  name: "Resolid",
  extensions: [
    createLogExtension({
      targets: { app: (ctx) => rotatingFileTarget(ctx, "app") },
      loggers: [
        {
          category: "app",
          sinks: ["app"],
        },
      ],
    }),
    createCacheExtension({
      store: (ctx) => new FileCache(ctx.runtimePath("cache")),
    }),
    createDatabaseExtension({
      connection: new MySqlConnection({
        tableName: { prefix: env.RX_DB_TABLE_PREFIX },
        poolOptions: {
          uri: env.RX_DB_URI,
          ssl: {
            ca: env.RX_DB_SSL_CA.replaceAll(/\\n/gm, "\n"),
            rejectUnauthorized: false,
          },
        },
      }),
      logger: __DEV__,
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
  providers: resolveProviders(injectableModules),
  expose: {
    logger: LogService,
    mailer: MailService,
  },
});

export type App = typeof app;

app.emitter.on("app:ready", (ctx) => {
  app.$.logger.category("app").info(`${ctx.name} application started.`);
});
