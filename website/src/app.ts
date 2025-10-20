import { createApp } from "@resolid/core";
import { createLogExtension, type LogService } from "@resolid/log";

export const DI_LOG_KEY = "LOG";

export const app = await createApp<Record<"logger", LogService>>({
  name: "resolid",
  extensions: [{ key: DI_LOG_KEY, extension: createLogExtension({ config: {} }) }],
  instanceProps: {
    logger: DI_LOG_KEY,
  },
});

app.emitter.on("app:ready", function () {
  app.logger.info("Resolid application started.");
});
