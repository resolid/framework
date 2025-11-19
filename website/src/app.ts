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
import { moduleProviders } from "~/modules/providers";

const inNode = import.meta.env.RESOLID_PLATFORM == "node";

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
          inNode
            ? ({
                category: "app",
                lowestLevel: "error",
                sinks: ["app"],
              } as LoggerEntity)
            : undefined,
        ].filter((v) => v != undefined),
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
        if (import.meta.env.RESOLID_PLATFORM == "vercel") {
          attachDatabasePool(pool);
        }
      },
    }),
  ].filter(Boolean) as Extension[],
  providers: [...moduleProviders],
  expose: {
    logger: {
      token: LogService,
    },
  },
});

app.emitter.on("app:ready", function () {
  app.$.logger.info("Resolid application started.");
});
