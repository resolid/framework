import type { AppContext, ExtensionCreator } from "@resolid/core";
import {
  type Config,
  configure,
  dispose,
  getConsoleSink,
  getLogger,
  lazy,
  type Logger,
  type LoggerConfig,
  type Sink,
  withContext,
  withFilter,
} from "@logtape/logtape";

export type LoggerEntity = { category: string } & Omit<LoggerConfig<string, string>, "category">;

export type LogConfig = { defaultTarget?: string; defaultCategory?: string } & Omit<
  Partial<Config<string, string>>,
  "reset" | "loggers"
> & {
    loggers?: LoggerEntity[];
  };

export { type Sink, withContext, withFilter, lazy };

type LogCategory = Pick<Logger, "debug" | "info" | "warn" | "error" | "fatal">;

export class LogService {
  private readonly _config: LogConfig;
  private readonly _defaultSink?: Sink;
  private readonly _defaultCategory: string;

  constructor(config: LogConfig = {}) {
    this._config = config;
    this._defaultCategory = config.defaultCategory ?? "app";
  }

  async configure(): Promise<void> {
    await configure({
      reset: true,
      sinks: {
        console: getConsoleSink(),
        default: this._defaultSink ?? getConsoleSink(),
        ...this._config.sinks,
      },
      filters: this._config.filters,
      loggers: [
        { category: [], sinks: ["console"], lowestLevel: "info" },
        { category: ["logtape", "meta"], sinks: [], parentSinks: "override" },
        { category: this._defaultCategory, sinks: ["default"] },
        ...(this._config.loggers ?? []),
      ],
    });
  }

  debug = ((...args: Parameters<Logger["debug"]>) =>
    this.getLogger().debug(...args)) as Logger["debug"];

  info = ((...args: Parameters<Logger["info"]>) =>
    this.getLogger().info(...args)) as Logger["info"];

  warn = ((...args: Parameters<Logger["warn"]>) =>
    this.getLogger().warn(...args)) as Logger["warn"];

  error = ((...args: Parameters<Logger["error"]>) =>
    this.getLogger().error(...args)) as Logger["error"];

  fatal = ((...args: Parameters<Logger["fatal"]>) =>
    this.getLogger().fatal(...args)) as Logger["fatal"];

  category(name: string): LogCategory {
    return getLogger(name);
  }

  getLogger(category: string = this._defaultCategory): Logger {
    return getLogger(category);
  }

  async dispose(): Promise<void> {
    await dispose();
  }
}

export type LogExtensionConfig = Omit<LogConfig, "sinks"> & {
  targets?: Record<string, (ctx: AppContext) => Sink>;
};

export function createLogExtension(config: LogExtensionConfig = {}): ExtensionCreator {
  return (ctx) => ({
    name: "resolid-log-module",
    providers: [
      {
        token: LogService,
        factory() {
          const { targets = {}, defaultCategory = ctx.name, ...rest } = config;

          const sinks: Record<string, Sink> = {};

          for (const [key, v] of Object.entries(targets)) {
            sinks[key] = v(ctx);
          }

          return new LogService({
            sinks,
            ...rest,
            defaultCategory,
          });
        },
      },
    ],
    async bootstrap() {
      await ctx.container.get(LogService).configure();
    },
  });
}
