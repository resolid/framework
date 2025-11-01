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

export type LogConfig = { defaultTarget?: string; defaultCategory?: string } & Omit<
  Partial<Config<string, string>>,
  "reset" | "loggers" | "sinks"
> & {
    loggers?: ({ category: string } & Omit<LoggerConfig<string, string>, "category">)[];
  };

type LogCategory = Pick<Logger, "debug" | "info" | "warn" | "error" | "fatal">;

export type Target = {
  name: string;
  sink: Sink | (Sink & Disposable);
};

export class LogService {
  private readonly config: LogConfig;

  private readonly defaultSink?: Sink;
  private readonly defaultCategory: string;

  private readonly sinks: Record<string, Sink> = {};

  constructor(targets: Target[], config: LogConfig = {}) {
    this.config = config;

    for (const target of targets) {
      this.sinks[target.name] = target.sink;
    }

    /* istanbul ignore next -- @preserve */
    if (config.defaultTarget) {
      this.defaultSink = this.sinks[config.defaultTarget];
    }

    /* istanbul ignore next -- @preserve */
    this.defaultCategory = config.defaultCategory ?? "app";
  }

  async configure(): Promise<void> {
    await configure({
      reset: true,
      sinks: {
        default:
          this.defaultSink ??
          getConsoleSink({
            formatter: getAnsiColorFormatter({
              timestamp: (t) => {
                /* istanbul ignore next -- @preserve */
                return new Date(t).toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-");
              },
            }),
          }),
        ...this.sinks,
      },
      filters: {
        ...this.config.filters,
      },
      loggers: [
        { category: ["logtape", "meta"], sinks: [] },
        { category: this.defaultCategory, sinks: ["default"] },
        ...(this.config.loggers ?? []),
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

export function createLogExtension(targets: Target[] = [], config: LogConfig = {}): ExtensionCreator {
  return (context) => {
    return {
      name: "resolid-log-module",
      providers: [
        {
          token: LogService,
          factory() {
            return new LogService(targets, { ...config, defaultCategory: config?.defaultCategory ?? context.name });
          },
        },
      ],
      async boot(context) {
        await context.container.get(LogService).configure();
      },
    };
  };
}
