import { createMySQLDatabaseExtension } from "@resolid/app-db-mysql";
import { createLogExtension, LogService } from "@resolid/app-log";
import { createApp } from "@resolid/core";
import { env } from "node:process";
import { SystemRepository } from "~/modules/system/repository.server";

export const app = await createApp<{
  logger: LogService;
}>({
  name: "resolid",
  extensions: [
    createLogExtension(),
    createMySQLDatabaseExtension({
      connection: {
        uri: env.RX_DB_URI,
        ssl: {
          rejectUnauthorized: true,
          ca: env.RX_DB_SSL_CA.replace(/\\n/gm, "\n"),
        },
      },
    }),
    {
      name: "app-repository",
      providers: [
        {
          token: SystemRepository,
          factory() {
            return new SystemRepository();
          },
        },
      ],
    },
  ],
  expose: {
    logger: {
      token: LogService,
    },
  },
});

app.emitter.on("app:ready", function () {
  app.$.logger.info("Resolid application started.");
});

await app.run();
