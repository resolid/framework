import { Container, inject, injectAsync, type Provider, type Token } from "@resolid/di";
import { Emitter } from "@resolid/event";
import { join } from "node:path";
import { cwd, env } from "node:process";

export { inject, injectAsync, type Emitter, type Token };

export type AppConfig = {
  readonly name: string;
  readonly debug?: boolean;
  readonly timezone?: string;
};

export type AppContext = AppConfig & {
  emitter: Emitter;
  container: Container;
  rootPath: (...paths: string[]) => string;
  runtimePath: (...paths: string[]) => string;
};

type BootFunction = (context: AppContext) => void | Promise<void>;

export type Extension = {
  name: string;
  providers?: Provider[];
  boot?: BootFunction;
};

export type ExtensionCreator = (context: AppContext) => Extension;

type ExposeEntry<T> = {
  token: Token<T>;
  async?: boolean;
};

type ExposeSchema = Record<string, ExposeEntry<unknown>>;

type InferExpose<E extends ExposeSchema> = {
  [K in keyof E]: E[K] extends { async: true; token: Token<infer T> }
    ? T
    : E[K] extends { token: Token<infer T> }
      ? T
      : never;
};

export type AppOptions<E extends ExposeSchema = Record<string, never>> = AppConfig & {
  readonly extensions?: (Extension | ExtensionCreator)[];
  readonly expose?: E;
};

class App<E extends Record<string, unknown>> {
  private readonly _root: string;
  private readonly _container: Container;
  private readonly _context: AppContext;
  private readonly _boots: BootFunction[] = [];
  private readonly _expose?: ExposeSchema;

  private _booted: boolean = false;

  public readonly name: string;
  public readonly debug: boolean;
  public readonly timezone: string;
  public readonly emitter: Emitter;

  public readonly $: E = Object.create(null);

  constructor({ name, debug = false, timezone = "UTC", extensions = [], expose }: AppOptions) {
    env.timezone = timezone;

    this._root = cwd();

    this.name = name;
    this.debug = debug;
    this.timezone = timezone;

    this._container = new Container();
    this.emitter = new Emitter();

    this._context = {
      name,
      debug,
      timezone,
      emitter: this.emitter,
      container: this._container,
      rootPath: (...paths: string[]) => this.rootPath(...paths),
      runtimePath: (...paths: string[]) => this.runtimePath(...paths),
    };

    for (const item of extensions) {
      const extension = typeof item === "function" ? item(this._context) : item;

      if (extension.providers) {
        for (const provider of extension.providers) {
          this._container.add(provider);
        }
      }

      if (extension.boot) {
        this._boots.push(extension.boot);
      }
    }

    this._expose = expose;
  }

  async init(): Promise<void> {
    if (this._expose) {
      for (const [key, value] of Object.entries(this._expose)) {
        this.$[key as keyof E] = (
          value.async ? await this._container.getAsync(value.token) : this._container.get(value.token)
        ) as E[typeof key];
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

  getAsync<T>(token: Token<T>): Promise<T> {
    return this._container.getAsync(token);
  }

  async run(): Promise<void> {
    if (this._booted) {
      return;
    }

    for (const boot of this._boots) {
      await boot(this._context);
    }

    this.emitter.emit("app:ready");
    this._booted = true;
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
