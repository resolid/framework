import { Container, inject, type Provider, type Token } from "@resolid/di";
import { Emitter } from "@resolid/event";
import { join } from "node:path";
import { cwd, env } from "node:process";

export { inject, type Emitter, type Provider, type Token };

export interface AppConfig {
  readonly name: string;
  readonly debug?: boolean;
  readonly timezone?: string;
}

export type PathResolver = (...paths: string[]) => string;

export type AppContext = AppConfig & {
  emitter: Emitter;
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

class App<E extends Record<string, unknown>> {
  private readonly _root: string;
  private readonly _container: Container;
  private readonly _context: AppContext;
  private readonly _bootstraps: BootstrapFunction[] = [];
  private readonly _expose?: ExposeSchema;

  private _started = false;

  public readonly name: string;
  public readonly debug: boolean;
  public readonly timezone: string;
  public readonly emitter: Emitter;

  public readonly $: E = Object.create(null);

  constructor({
    name,
    debug = false,
    timezone = "UTC",
    extensions = [],
    providers = [],
    expose,
  }: AppOptions) {
    env.timezone = timezone;

    this._root = cwd();
    this._container = new Container();

    this.name = name;
    this.debug = debug;
    this.timezone = timezone;
    this.emitter = new Emitter();

    this._context = {
      name,
      debug,
      timezone,
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
    if (this._expose) {
      for (const [key, value] of Object.entries(this._expose)) {
        this.$[key as keyof E] = this._container.get(value) as E[typeof key];
      }
    }
  }

  rootPath(...paths: string[]): string {
    return join(this._root, ...paths.map((p) => p.replace(/\\/g, "/")));
  }

  runtimePath(...paths: string[]): string {
    return this.rootPath("runtime", ...paths);
  }

  get<T>(token: Token<T>): T {
    return this._container.get(token);
  }

  async run(): Promise<void> {
    if (this._started) {
      return;
    }

    await Promise.all(this._bootstraps.map((bootstrap) => bootstrap(this._context)));

    this.emitter.emit("app:ready");
    this._started = true;
  }

  async dispose(): Promise<void> {
    await this._container.dispose();

    this.emitter.offAll();
  }
}

export async function createApp<E extends ExposeSchema = Record<string, never>>(
  options: AppOptions<E>,
): Promise<App<InferExpose<E>>> {
  const app = new App<InferExpose<E>>(options as unknown as AppOptions);

  await app.init();

  return app;
}
