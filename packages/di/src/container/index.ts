import { InjectionContext } from "../context";
import { type Disposable, type Resolver, type Token, toString } from "../shared";

export type Scope = "singleton" | "transient";

type SyncProvider<T = unknown> = {
  token: Token<T>;
  factory: (resolver: Resolver) => T;
  async?: false;
  scope?: Scope;
};

type AsyncProvider<T = unknown> = {
  token: Token<T>;
  factory: (resolver: Resolver) => Promise<T>;
  async?: true;
  scope?: Scope;
};

export type Provider<T = unknown> = SyncProvider<T> | AsyncProvider<T>;

export type { Resolver };

export class Container implements Resolver, Disposable {
  private readonly _providers = new Map<Token, Provider>();
  private readonly _singletons = new Map<Token, unknown>();
  private readonly _constructing: Token[] = [];

  private _checkCircularDependency(token: Token) {
    if (this._constructing.includes(token)) {
      throw new Error(
        `Circular dependency detected ${[...this._constructing, token].map(toString).join(" -> ")}`,
      );
    }
  }

  private _resolveProvide(token: Token, optional: boolean) {
    const provider = this._providers.get(token);

    if (provider === undefined && !optional) {
      throw new Error(`No provider found for ${toString(token)}`);
    }

    return provider;
  }

  private _resolve<T>(token: Token<T>, optional: boolean): T | undefined {
    this._checkCircularDependency(token);

    const provider = this._resolveProvide(token, optional);

    if (provider === undefined) {
      return undefined;
    }

    if (provider.async) {
      throw new Error(`Provider for ${toString(token)} is async, please use injectAsync()`);
    }

    const singleton = provider.scope !== "transient";

    if (singleton && this._singletons.has(token)) {
      return this._singletons.get(token) as T;
    }

    this._constructing.push(token);

    try {
      const value = new InjectionContext(this).run(() => {
        return provider.factory(this);
      });

      if (singleton) {
        this._singletons.set(token, value);
      }

      return value as T;
    } finally {
      this._constructing.pop();
    }
  }

  private async _resolveAsync<T>(token: Token<T>, optional: boolean): Promise<T | undefined> {
    this._checkCircularDependency(token);

    const provider = this._resolveProvide(token, optional);

    if (provider === undefined) {
      return undefined;
    }

    const singleton = provider.scope !== "transient";

    if (singleton && this._singletons.has(token)) {
      return this._singletons.get(token) as T;
    }

    this._constructing.push(token);

    try {
      const value = await new InjectionContext(this).runAsync(async () => {
        return await (provider as AsyncProvider).factory(this);
      });

      /* istanbul ignore else -- @preserve */
      if (singleton) {
        this._singletons.set(token, value);
      }

      return value as T;
    } finally {
      this._constructing.pop();
    }
  }

  add(provider: Provider): void {
    this._providers.set(provider.token, provider);
  }

  get<T>(token: Token<T>): T;
  get<T>(token: Token<T>, options: { optional: true }): T | undefined;
  get<T>(token: Token<T>, options: { lazy: true }): () => T;
  get<T>(token: Token<T>, options: { lazy: true; optional: true }): () => T | undefined;
  get<T>(token: Token<T>, options: { lazy?: false; optional?: boolean }): T | undefined;
  get<T>(
    token: Token<T>,
    options?: { lazy?: boolean; optional?: boolean },
  ): T | undefined | (() => T | undefined) {
    const lazy = options?.lazy ?? false;

    if (lazy) {
      return () => this.get(token, { ...options, lazy: false });
    }

    return this._resolve(token, options?.optional ?? false) as unknown as T | undefined;
  }

  getAsync<T>(token: Token<T>): Promise<T>;
  getAsync<T>(token: Token<T>, options: { optional: true }): Promise<T | undefined>;
  getAsync<T>(token: Token<T>, options: { lazy: true }): () => Promise<T>;
  getAsync<T>(
    token: Token<T>,
    options: { lazy: true; optional: true },
  ): () => Promise<T | undefined>;
  getAsync<T>(
    token: Token<T>,
    options: { lazy?: false; optional?: boolean },
  ): Promise<T | undefined>;
  getAsync<T>(
    token: Token<T>,
    options?: { lazy?: boolean; optional?: boolean },
  ): Promise<T | undefined> | (() => Promise<T | undefined>) {
    const lazy = options?.lazy ?? false;

    if (lazy) {
      return () => this.getAsync(token, { ...options, lazy: false });
    }

    return this._resolveAsync(token, options?.optional ?? false);
  }

  async dispose(): Promise<void> {
    let errorCount = 0;
    let errorMsg = "";

    for (const [token, instance] of this._singletons) {
      /* istanbul ignore else -- @preserve */
      if (typeof (instance as Disposable).dispose === "function") {
        try {
          await (instance as Disposable).dispose();
        } catch (err) {
          errorCount++;
          /* istanbul ignore next -- @preserve */
          errorMsg += `${toString(token)}: ${err instanceof Error ? err.message : err}; `;
        }
      }
    }

    this._singletons.clear();

    if (errorCount > 0) {
      throw new Error(`Failed to dispose ${errorCount} provider(s):\n${errorMsg.slice(0, -2)}`);
    }
  }
}
