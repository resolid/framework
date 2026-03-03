import { createMySQLDatabaseExtension } from "@resolid/app-db-mysql";
import {
  createLogExtension,
  createLogTarget,
  type LoggerEntity,
  LogService,
  type LogTarget,
} from "@resolid/app-log";
import { createFileLogExtension, FileLogService } from "@resolid/app-log-file";
import { createApp, type Extension } from "@resolid/core";
import { attachDatabasePool } from "@vercel/functions";
import { env } from "node:process";
import { platform } from "~/foundation/platform.server";
import { moduleProviders } from "~/modules/providers";

const inNode = platform == "node";

export const app = await createApp({
  name: "resolid",
  extensions: [
    createLogExtension(
      [
        inNode &&
          createLogTarget({
            ref: FileLogService,
            sinks(service) {
              return {
                app: service.rotatingFileSink("app"),
              };
            },
          }),
      ].filter(Boolean) as LogTarget[],
      {
        loggers: [
          inNode && {
            category: "app",
            sinks: ["app"],
          },
        ].filter(Boolean) as LoggerEntity[],
      },
    ),
    inNode && createFileLogExtension(),
    createMySQLDatabaseExtension({
      connection: {
        uri: env.RX_DB_URI,
        ssl: {
          rejectUnauthorized: true,
          ca: env.RX_DB_SSL_CA.replace(/\\n/gm, "\n"),
        },
      },
      enhancer: (pool) => {
        if (platform == "vercel") {
          attachDatabasePool(pool);
        }
      },
    }),
  ].filter(Boolean) as Extension[],
  providers: [...moduleProviders],
  expose: {
    logger: LogService,
  },
});

app.emitter.on("app:ready", () => {
  app.$.logger.info("Resolid application started.");
});
