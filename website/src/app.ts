import { createMySQLDatabaseExtension } from "@resolid/app-db-mysql";
import { createLogExtension, createLogTarget, type LoggerEntity, LogService } from "@resolid/app-log";
import { createFileLogExtension, FileLogService } from "@resolid/app-log-file";
import { createApp } from "@resolid/core";
import { env } from "node:process";
import { SystemRepository } from "~/modules/system/repository.server";

const inNode = import.meta.env.RESOLID_PLATFORM == "node";

export const app = await createApp({
  name: "resolid",
  extensions: [
    createLogExtension(
      [
        inNode
          ? createLogTarget({
              ref: FileLogService,
              sinks(service) {
                return {
                  app: service.rotatingFileSink("app"),
                };
              },
            })
          : undefined,
      ].filter((v) => v != undefined),
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
    inNode ? createFileLogExtension() : undefined,
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
  ].filter((v) => v !== undefined),
  expose: {
    logger: {
      token: LogService,
    },
  },
});

app.emitter.on("app:ready", function () {
  app.$.logger.info("Resolid application started.");
});
