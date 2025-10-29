import { createLogExtension, LogService } from "@resolid/app-log";
import { createApp } from "@resolid/core";

export const app = await createApp<{
  logger: LogService;
}>({
  name: "resolid",
  extensions: [createLogExtension()],
  expose: {
    logger: {
      token: LogService,
      async: true,
    },
  },
});

app.emitter.on("app:ready", function () {
  app.$.logger.info("Resolid application started.");
});
