import type { ExtensionCreator, Token } from "@resolid/core";
import {
  type Config,
  configure,
  dispose,
  getConsoleSink,
  getLogger,
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

export type { Sink };

type LogCategory = Pick<Logger, "debug" | "info" | "warn" | "error" | "fatal">;

export class LogService {
  private readonly _config: LogConfig;
  private readonly _defaultSink?: Sink;
  private readonly _defaultCategory: string;

  constructor(config: LogConfig = {}) {
    this._config = config;

    /* istanbul ignore next -- @preserve */
    this._defaultCategory = config.defaultCategory ?? "app";
  }

  async configure(): Promise<void> {
    await configure({
      reset: true,
      sinks: {
        default: this._defaultSink ?? getConsoleSink(),
        ...this._config.sinks,
      },
      filters: this._config.filters,
      loggers: [
        { category: ["logtape", "meta"], sinks: [] },
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

  withContext: typeof withContext = withContext;
  withFilter: typeof withFilter = withFilter;

  async dispose(): Promise<void> {
    /* istanbul ignore next -- @preserve */
    await dispose();
  }
}

export interface LogTarget {
  ref: Token<unknown>;
  sinks: (service: unknown) => Record<string, Sink>;
}

/* istanbul ignore next -- @preserve */
export function createLogTarget<T>(target: {
  ref: Token<T>;
  sinks: (service: T) => Record<string, Sink>;
}): LogTarget {
  return {
    ref: target.ref as Token<unknown>,
    sinks: target.sinks as (service: unknown) => Record<string, Sink>,
  };
}

export function createLogExtension(
  targets: readonly LogTarget[] = [],
  config: Omit<LogConfig, "sinks"> = {},
): ExtensionCreator {
  return (context) => ({
    name: "resolid-log-module",
    providers: [
      {
        token: LogService,
        factory() {
          /* istanbul ignore next -- @preserve */
          const sinks = targets.reduce<Record<string, Sink>>((acc, target) => {
            const service = context.container.get(target.ref);
            return { ...acc, ...target.sinks(service) };
          }, {});

          return new LogService({
            sinks,
            ...config,
            defaultCategory: config?.defaultCategory ?? context.name,
          });
        },
      },
    ],
    async bootstrap(ctx) {
      await ctx.container.get(LogService).configure();
    },
  });
}
