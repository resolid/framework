import { Container, type Provider, type Token } from "@resolid/di";
import { Emitter } from "@resolid/event";
import nodePath from "node:path";
import { cwd, env } from "node:process";
import { disposeApp, forgetApp, hotContext, rememberApp } from "./hmr";

export type { Emitter } from "@resolid/event";
export { inject, type Provider, type Token } from "@resolid/di";

export interface AppConfig {
  readonly name: string;
  readonly debug?: boolean;
  readonly timezone?: string;
}

export interface AppEvents {
  "app:ready": [Required<AppConfig>];
}

export type PathResolver = (...paths: string[]) => string;

export type AppContext = AppConfig & {
  emitter: Emitter<AppEvents>;
  container: Container;
  rootPath: PathResolver;
  runtimePath: PathResolver;
};

type BootstrapFunction = (context: AppContext) => void | Promise<void>;

export interface Extension {
  name: string;
  providers?: Provider[];
  bootstrap?: BootstrapFunction;
}

export type ExtensionCreator = (context: AppContext) => Extension;

type ExposeSchema = Record<string, Token>;

type InferExpose<E extends ExposeSchema> = {
  [K in keyof E]: E[K] extends Token<infer T> ? T : never;
};

export type AppOptions<E extends ExposeSchema = Record<string, never>> = AppConfig & {
  readonly extensions?: (Extension | ExtensionCreator)[];
  readonly providers?: Provider[];
  readonly expose?: E;
};

export class App<E extends ExposeSchema = Record<string, never>> {
  private readonly _root: string;
  private readonly _container: Container;
  private readonly _context: AppContext;
  private readonly _bootstraps: BootstrapFunction[] = [];
  private readonly _expose?: E;

  private _startPromise?: Promise<void>;
  private _disposePromise?: Promise<void>;

  public readonly name: string;
  public readonly debug: boolean;
  public readonly timezone: string;
  public readonly emitter: Emitter<AppEvents>;

  public readonly $: InferExpose<E> = Object.create(null) as InferExpose<E>;

  constructor({
    name,
    debug = false,
    timezone,
    extensions = [],
    providers = [],
    expose,
  }: AppOptions<E>) {
    const resolvedTimezone = timezone ?? env.TZ ?? "UTC";

    env.TZ = resolvedTimezone;

    this._root = cwd();
    this._container = new Container();

    this.name = name;
    this.debug = debug;
    this.timezone = resolvedTimezone;
    this.emitter = new Emitter<AppEvents>();

    this._context = {
      name,
      debug,
      timezone: resolvedTimezone,
      emitter: this.emitter,
      container: this._container,
      /* istanbul ignore next -- @preserve */
      rootPath: (...paths: string[]) => this.rootPath(...paths),
      /* istanbul ignore next -- @preserve */
      runtimePath: (...paths: string[]) => this.runtimePath(...paths),
    };

    for (const item of extensions) {
      const extension = typeof item === "function" ? item(this._context) : item;

      if (extension.providers) {
        for (const provider of extension.providers) {
          this._container.add(provider);
        }
      }

      if (extension.bootstrap) {
        this._bootstraps.push(extension.bootstrap);
      }
    }

    for (const provider of providers) {
      this._container.add(provider);
    }

    this._expose = expose;
  }

  async init(): Promise<void> {
    if (!this._expose) {
      return;
    }

    const exposed = this.$ as Record<string, unknown>;

    for (const [key, token] of Object.entries(this._expose)) {
      exposed[key] = this._container.get(token);
    }
  }

  rootPath(...paths: string[]): string {
    return nodePath.join(this._root, ...paths.map((p) => p.replaceAll("\\", "/")));
  }

  runtimePath(...paths: string[]): string {
    return this.rootPath("runtime", ...paths);
  }

  get<T>(token: Token<T>): T {
    return this._container.get(token);
  }

  async run(): Promise<void> {
    if (this._disposePromise) {
      throw new Error("Cannot run a disposed application.");
    }

    this._startPromise ??= this._start();

    return this._startPromise;
  }

  private async _start(): Promise<void> {
    for (const bootstrap of this._bootstraps) {
      // oxlint-disable-next-line no-await-in-loop
      await bootstrap(this._context);
    }

    this.emitter.emit("app:ready", { name: this.name, debug: this.debug, timezone: this.timezone });
  }

  dispose(): Promise<void> {
    this._disposePromise ??= this._dispose();

    return this._disposePromise;
  }

  private async _dispose(): Promise<void> {
    try {
      await this._startPromise?.catch(() => undefined);
      await this._container.dispose();
    } finally {
      this.emitter.offAll();
    }
  }
}

export async function createApp<E extends ExposeSchema = Record<string, never>>(
  options: AppOptions<E>,
): Promise<App<E>> {
  if (hotContext) {
    await disposeApp(hotContext);
  }

  const app: App<E> = new App(options);

  if (hotContext) {
    rememberApp(hotContext, app);
  }

  try {
    await app.init();
  } catch (error) {
    if (hotContext) {
      forgetApp(hotContext, app);
    }

    await app.dispose();

    throw error;
  }

  return app;
}

function isProvider(value: unknown): value is Provider {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<Provider>;

  return candidate.token !== undefined && typeof candidate.factory === "function";
}

function isProviderClass(value: unknown): value is new () => unknown {
  return typeof value === "function" && value.prototype !== undefined && /^[A-Z]/.test(value.name);
}

export function loadProviders(modules: Record<string, unknown>[]): Provider[] {
  const providers: Map<Token, Provider> = new Map();

  for (const mod of modules) {
    for (const value of Object.values(mod)) {
      if (isProvider(value)) {
        providers.set(value.token, value);
      } else if (isProviderClass(value)) {
        providers.set(value, { token: value, factory: () => new value() });
      }
    }
  }

  return [...providers.values()];
}
