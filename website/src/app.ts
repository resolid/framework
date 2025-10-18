import { createApp } from "@resolid/core";
import { logExtension, type LogConfig } from "@resolid/log";

const logConfig: LogConfig = {};

export const DI_LOG_KEY = "LOG";

export const { app, context } = createApp({
  name: "resolid",
  extensions: [{ key: DI_LOG_KEY, extension: logExtension, config: logConfig }],
});
