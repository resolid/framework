import { InjectionContext } from "../context";
import { type Disposable, type Resolver, type Token, toString } from "../shared";

export type Scope = "singleton" | "transient";

export type Provider<T = unknown> = {
  token: Token<T>;
  factory: () => T;
  scope?: Scope;
};

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

  private _resolve<T>(token: Token<T>, optional: boolean): T | undefined {
    this._checkCircularDependency(token);

    const provider = this._providers.get(token);

    if (provider === undefined) {
      if (!optional) {
        throw new Error(`No provider found for ${toString(token)}`);
      }

      return undefined;
    }

    const singleton = provider.scope !== "transient";

    if (singleton && this._singletons.has(token)) {
      return this._singletons.get(token) as T;
    }

    this._constructing.push(token);

    try {
      const value = new InjectionContext(this).run(() => {
        return provider.factory();
      });

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
