import { Container, type Provider, type Token } from "@resolid/di";
import { Emitter } from "@resolid/event";
import { join } from "node:path";
import { cwd, env } from "node:process";

export { inject, injectAsync } from "@resolid/di";
export type { Emitter } from "@resolid/event";

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

type Expose<E> = {
  [K in keyof E]: {
    token: Token;
    async?: boolean;
  };
};

export type AppOptions<E> = AppConfig & {
  readonly extensions?: (Extension | ExtensionCreator)[];
  readonly expose?: E;
};

class App<E extends Record<string, unknown>> {
  private readonly root: string;
  private readonly container: Container;
  private readonly context: AppContext;

  private readonly boots: BootFunction[] = [];

  private booted: boolean = false;

  private readonly expose?: Expose<E>;

  public readonly name: string;
  public readonly debug: boolean;
  public readonly timezone: string;
  public readonly emitter: Emitter;

  public readonly $: E = Object.create(null);

  constructor({ name, debug = false, timezone = "UTC", extensions = [], expose }: AppOptions<Expose<E>>) {
    env.timezone = timezone;

    this.root = cwd();

    this.name = name;
    this.debug = debug;
    this.timezone = timezone;

    this.container = new Container();
    this.emitter = new Emitter();

    this.context = {
      name,
      debug,
      timezone,
      emitter: this.emitter,
      container: this.container,
      rootPath: this.rootPath,
      runtimePath: this.runtimePath,
    };

    for (const item of extensions) {
      const extension = typeof item === "function" ? item(this.context) : item;

      if (extension.providers) {
        for (const provider of extension.providers) {
          this.container.add(provider);
        }
      }

      if (extension.boot) {
        this.boots.push(extension.boot);
      }
    }

    this.expose = expose;
  }

  async init(): Promise<void> {
    if (this.expose) {
      for (const [key, value] of Object.entries(this.expose)) {
        this.$[key as keyof E] = (
          value.async ? await this.container.getAsync(value.token) : this.container.get(value.token)
        ) as E[typeof key];
      }
    }
  }

  rootPath(...paths: string[]): string {
    return join(this.root, ...paths.map((p) => p.replace(/\\/g, "/")));
  }

  runtimePath(...paths: string[]): string {
    return this.rootPath("runtime", ...paths);
  }

  get<T>(token: Token<T>): T {
    return this.container.get(token);
  }

  getAsync<T>(token: Token<T>): Promise<T> {
    return this.container.getAsync(token);
  }

  async run(): Promise<void> {
    if (!this.booted) {
      for (const boot of this.boots) {
        await boot(this.context);
      }

      this.emitter.emit("app:ready");
    }

    this.booted = true;
  }

  async dispose(): Promise<void> {
    await this.container.dispose();

    this.emitter.offAll();
  }
}

export async function createApp<E extends Record<string, unknown>>(options: AppOptions<Expose<E>>): Promise<App<E>> {
  const app = new App<E>(options);

  await app.init();

  return app;
}
