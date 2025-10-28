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
import type { ExtensionCreator } from "@resolid/core";

export type LogConfig = { defaultSink?: Sink; defaultCategory?: string } & Omit<
  Partial<Config<string, string>>,
  "reset" | "loggers"
> & {
    loggers?: ({ category: string } & Omit<LoggerConfig<string, string>, "category">)[];
  };

type LogCategory = Pick<Logger, "debug" | "info" | "warn" | "error" | "fatal">;

export class LogService {
  private readonly config?: LogConfig;
  private readonly defaultCategory: string;

  constructor(config?: LogConfig) {
    this.config = config;

    /* istanbul ignore next -- @preserve */
    this.defaultCategory = config?.defaultCategory ?? "app";
  }

  async configure(): Promise<void> {
    await configure({
      reset: true,
      sinks: {
        default:
          this.config?.defaultSink ??
          getConsoleSink({
            formatter: getAnsiColorFormatter({
              timestamp: (t) => {
                /* istanbul ignore next -- @preserve */
                return new Date(t).toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-");
              },
            }),
          }),
        ...this.config?.sinks,
      },
      filters: {
        ...this.config?.filters,
      },
      loggers: [
        { category: ["logtape", "meta"], sinks: [] },
        { category: this.defaultCategory, sinks: ["default"] },
        ...(this.config?.loggers ?? []),
      ],
    });
  }

  debug = ((...args: Parameters<Logger["debug"]>) => {
    return this.getLogger().debug(...args);
  }) as Logger["debug"];

  info = ((...args: Parameters<Logger["info"]>) => {
    return this.getLogger().info(...args);
  }) as Logger["info"];

  warn = ((...args: Parameters<Logger["warn"]>) => {
    return this.getLogger().warn(...args);
  }) as Logger["warn"];

  error = ((...args: Parameters<Logger["error"]>) => {
    return this.getLogger().error(...args);
  }) as Logger["error"];

  fatal = ((...args: Parameters<Logger["fatal"]>) => {
    return this.getLogger().fatal(...args);
  }) as Logger["fatal"];

  category(name: string): LogCategory {
    return getLogger(name);
  }

  getLogger(category: string = this.defaultCategory): Logger {
    return getLogger(category);
  }

  withContext: typeof withContext = withContext;
  withFilter: typeof withFilter = withFilter;

  async dispose(): Promise<void> {
    /* istanbul ignore next -- @preserve */
    await dispose();
  }
}

export const createLogExtension = (config?: LogConfig): ExtensionCreator => {
  return (context) => {
    return {
      name: "resolid-log-extension",
      providers: [
        {
          token: LogService,
          async factory() {
            const logService = new LogService({ ...config, defaultCategory: config?.defaultCategory ?? context.name });

            await logService.configure();

            return logService;
          },
          async: true,
        },
      ],
    };
  };
};
