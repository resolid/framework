import { type Config, configure, dispose, getConsoleSink, getLogger, type Logger, withContext } from "@logtape/logtape";
import type { Extension } from "@resolid/core";

export const LOG_SYMBOL = Symbol("LOG");

export type LogConfig = Omit<Config<string, string>, "reset">;

export type LogService = {
  getLogger: (category?: string | readonly string[]) => Logger;
  withContext: <T>(context: Record<string, unknown>, callback: () => T) => T;
  dispose: () => Promise<void>;
};

export const logExtension: Extension<LogService, LogConfig> = {
  name: LOG_SYMBOL,
  factory: async ({ config, app }) => {
    console.log(`[${app.name}] Initializing log extension...`);

    await configure({
      reset: true,
      sinks: {
        console: getConsoleSink(),
        ...config?.sinks,
      },
      filters: {
        ...config?.filters,
      },
      loggers: [{ category: ["logtape", "meta"], sinks: [] }, ...(config?.loggers ?? [])],
    });

    return {
      getLogger,
      withContext,
      dispose,
    };
  },
};
