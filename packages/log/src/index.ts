import {
  type Config,
  configure,
  dispose,
  getConsoleSink,
  getLogger,
  type Logger,
  withContext,
  withFilter,
} from "@logtape/logtape";
import type { Extension } from "@resolid/core";

export const LOG_SYMBOL: unique symbol = Symbol("LOG");

export type LogConfig = Omit<Config<string, string>, "reset">;

type LogChannel = Pick<Logger, "debug" | "info" | "warn" | "error" | "fatal">;

export type LogService = {
  channel: (category: string) => LogChannel;
  getLogger: (category: string) => Logger;
  withContext: typeof withContext;
  withFilter: typeof withFilter;
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

    const channelCache = new Map<string, LogChannel>();

    return {
      channel: (category) => {
        let channel = channelCache.get(category);

        if (!channel) {
          const logger = getLogger(category);

          channel = {
            debug: ((...args: Parameters<Logger["debug"]>) => logger.debug(...args)) as Logger["debug"],
            info: ((...args: Parameters<Logger["info"]>) => logger.info(...args)) as Logger["info"],
            warn: ((...args: Parameters<Logger["warn"]>) => logger.warn(...args)) as Logger["warn"],
            error: ((...args: Parameters<Logger["error"]>) => logger.error(...args)) as Logger["error"],
            fatal: ((...args: Parameters<Logger["fatal"]>) => logger.fatal(...args)) as Logger["fatal"],
          };

          channelCache.set(category, channel);
        }

        return channel;
      },
      getLogger: (category) => getLogger(category),
      withContext,
      withFilter,
      dispose,
    };
  },
};
