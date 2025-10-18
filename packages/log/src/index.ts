import {
  type Config,
  configure,
  dispose,
  getAnsiColorFormatter,
  getConsoleSink,
  getLogger,
  type Logger,
  type LoggerConfig,
  type Sink,
  withContext,
  withFilter,
} from "@logtape/logtape";
import type { Extension } from "@resolid/core";

export const LOG_SYMBOL: unique symbol = Symbol("LOG");

export type LogConfig = { defaultSink?: Sink; defaultCategory?: string } & Omit<
  Config<string, string>,
  "reset" | "loggers"
> & {
    loggers?: ({ category: string } & Omit<LoggerConfig<string, string>, "category">)[];
  };

type LogCategory = Pick<Logger, "debug" | "info" | "warn" | "error" | "fatal">;

export type LogService = LogCategory & {
  category: (name: string) => LogCategory;
  getLogger: (category?: string) => Logger;
  withContext: typeof withContext;
  withFilter: typeof withFilter;
  dispose: () => Promise<void>;
};

export const logExtension: Extension<LogService, LogConfig> = {
  name: LOG_SYMBOL,
  factory: async ({ config, app }) => {
    console.log(`[${app.name}] Initializing log extension...`);

    const defaultCategory = config?.defaultCategory ?? "app";

    await configure({
      reset: true,
      sinks: {
        default:
          config?.defaultSink ??
          getConsoleSink({
            formatter: getAnsiColorFormatter({
              timestamp: (t) => {
                return new Date(t).toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-");
              },
            }),
          }),
        ...config?.sinks,
      },
      filters: {
        ...config?.filters,
      },
      loggers: [
        { category: ["logtape", "meta"], sinks: [] },
        { category: defaultCategory, sinks: ["default"] },
        ...(config?.loggers ?? []),
      ],
    });

    const categoryCache = new Map<string, LogCategory>();

    const category = (name: string): LogCategory => {
      let category = categoryCache.get(name);

      if (!category) {
        const logger = getLogger(name);

        category = {
          debug: ((...args: Parameters<Logger["debug"]>) => logger.debug(...args)) as Logger["debug"],
          info: ((...args: Parameters<Logger["info"]>) => logger.info(...args)) as Logger["info"],
          warn: ((...args: Parameters<Logger["warn"]>) => logger.warn(...args)) as Logger["warn"],
          error: ((...args: Parameters<Logger["error"]>) => logger.error(...args)) as Logger["error"],
          fatal: ((...args: Parameters<Logger["fatal"]>) => logger.fatal(...args)) as Logger["fatal"],
        };

        categoryCache.set(name, category);
      }

      return category;
    };

    return {
      ...category(defaultCategory),
      category,
      getLogger: (category = defaultCategory) => getLogger(category),
      withContext,
      withFilter,
      dispose,
    };
  },
};
