import type { AppContext, ExtensionCreator } from "@resolid/app";
import {
  type Config,
  configure,
  dispose,
  getConsoleSink,
  getLogger,
  type Logger,
  type LoggerConfig,
  type Sink,
} from "@logtape/logtape";

export { type Sink, withContext, withFilter, lazy } from "@logtape/logtape";

export type LoggerEntity = { category: string } & Omit<LoggerConfig<string, string>, "category">;

export type LogConfig = { defaultTarget?: string; defaultCategory?: string } & Omit<
  Partial<Config<string, string>>,
  "reset" | "loggers"
> & {
    loggers?: LoggerEntity[];
  };

export type LogCategory = Pick<Logger, "debug" | "info" | "warn" | "error" | "fatal">;

const CONSOLE_TARGET = "console";
const DEFAULT_TARGET = "default";
const DEFAULT_CATEGORY = "app";

function assertTargetExists(target: string, targets: Iterable<string>): void {
  const availableTargets = new Set([CONSOLE_TARGET, DEFAULT_TARGET, ...targets]);

  if (!availableTargets.has(target)) {
    throw new Error(
      `Default target "${target}" does not exist. Available targets: ${[...availableTargets].join(", ")}.`,
    );
  }
}

export class LogService {
  private readonly _config: LogConfig;
  private readonly _defaultTarget: string;
  private readonly _defaultCategory: string;

  constructor(config: LogConfig = {}) {
    this._config = config;
    this._defaultCategory = config.defaultCategory ?? DEFAULT_CATEGORY;
    this._defaultTarget = config.defaultTarget ?? DEFAULT_TARGET;

    assertTargetExists(this._defaultTarget, Object.keys(config.sinks ?? {}));
  }

  async configure(): Promise<void> {
    const consoleSink = getConsoleSink();

    await configure({
      reset: true,
      sinks: {
        [CONSOLE_TARGET]: consoleSink,
        [DEFAULT_TARGET]: consoleSink,
        ...this._config.sinks,
      },
      filters: this._config.filters,
      contextLocalStorage: this._config.contextLocalStorage,
      loggers: [
        { category: [], sinks: [CONSOLE_TARGET], lowestLevel: "info" },
        { category: ["logtape", "meta"], sinks: [], parentSinks: "override" },
        {
          category: this._defaultCategory,
          sinks: [this._defaultTarget],
          parentSinks: "override",
        },
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
    return this.getLogger(name);
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
  const { targets = {}, ...logConfig } = config;

  if (logConfig.defaultTarget !== undefined) {
    assertTargetExists(logConfig.defaultTarget, Object.keys(targets));
  }

  return (ctx) => ({
    name: "resolid-log-module",
    providers: [
      {
        token: LogService,
        factory() {
          const sinks: Record<string, Sink> = {};

          for (const [key, createTarget] of Object.entries(targets)) {
            sinks[key] = createTarget(ctx);
          }

          return new LogService({
            ...logConfig,
            sinks,
            defaultCategory: logConfig.defaultCategory ?? ctx.name,
          });
        },
      },
    ],
    async bootstrap() {
      await ctx.container.get(LogService).configure();
    },
  });
}
