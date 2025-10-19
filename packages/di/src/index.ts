// eslint-disable-next-line n/prefer-global/process
const DEV = process.env.NODE_ENV === "development";

type Resolve = <T>(name: string) => Promise<T>;
type LazyResolve = <T = unknown>(name: string) => Readonly<{ value: T }>;

export type Scope = "singleton" | "transient";

export type Resolver = {
  resolve: Resolve;
  lazyResolve: LazyResolve;
};

export type FactoryConfig = Record<string, unknown>;

export type BindingDefinition<T = unknown, C extends FactoryConfig = FactoryConfig> =
  | {
      name: string;
      value: T;
      callable?: never;
      factory?: never;
      scope?: never;
      config?: never;
    }
  | {
      name: string;
      callable: (...args: unknown[]) => T;
      value?: never;
      factory?: never;
      scope?: never;
      config?: never;
    }
  | {
      name: string;
      factory: (options: { resolver: Resolver; config?: C }) => T | Promise<T>;
      scope?: Scope;
      config?: C;
      value?: never;
      callable?: never;
    };

type Disposable = {
  dispose: () => Promise<void> | void;
};

export type Container = {
  resolve: Resolve;
} & Disposable;

export const createContainer = (definitions: readonly BindingDefinition[]): Container => {
  const container = singleton("__R_DI", () => {
    const container = new DIContainer();
    container.register(definitions);
    return container;
  });

  return {
    resolve: <T>(name: string) => container.resolve<T>(name),
    dispose: () => container.dispose(),
  };
};

/* istanbul ignore next -- @preserve */
const singleton = <T>(key: string, getValue: () => T): T => {
  if (!DEV) {
    return getValue();
  }

  const globalStore = globalThis as Record<string, unknown>;

  if (key in globalStore) {
    return globalStore[key] as T;
  }

  const value = getValue();

  globalStore[key] = value;

  return value;
};

class DIContainer {
  readonly _bindings: Map<
    string,
    {
      factory: (resolve: Resolve, lazyResolve: LazyResolve) => unknown | Promise<unknown>;
      scope: Scope;
      config?: unknown;
    }
  >;
  readonly _singletons: Map<string, unknown>;
  readonly _constructing: string[];
  readonly _lazyResolveQueue: {
    name: string;
    resolve: (value: unknown) => void;
  }[] = [];

  constructor(parent?: DIContainer, item?: string, constructing?: string[]) {
    this._bindings = parent?._bindings ?? new Map();
    this._singletons = parent?._singletons ?? new Map();
    /* istanbul ignore next -- @preserve */
    this._constructing = item ? [...(constructing ?? parent?._constructing ?? []), item] : [];
  }

  register(definitions: readonly BindingDefinition[]) {
    for (const definition of definitions) {
      const factory = definition.callable
        ? () => definition.callable
        : definition.factory
          ? (resolve: Resolve, lazyResolve: LazyResolve) =>
              definition.factory({
                resolver: { resolve: resolve, lazyResolve: lazyResolve },
                config: definition.config,
              })
          : () => definition.value;

      this._bindings.set(definition.name, {
        factory,
        scope: definition.scope ?? "singleton",
        config: definition.config,
      });
    }
  }

  async _resolveBinding<T>(name: string, constructing?: string[]) {
    const binding = this._bindings.get(name);

    if (!binding) {
      /* istanbul ignore next -- @preserve */
      throw new Error(`No binding found for ${name}.`);
    }

    const isSingleton = binding.scope === "singleton";

    if (isSingleton && this._singletons.has(name)) {
      return this._singletons.get(name) as T;
    }

    const child = new DIContainer(this, name, constructing);

    const result = binding.factory(
      (n) => child.resolve(n),
      (n) => child.lazyResolve(n),
    );

    const resolved = result instanceof Promise ? await result : result;

    if (isSingleton) {
      this._singletons.set(name, resolved);
    }

    await child.dequeueLazyResolves();

    return resolved as T;
  }

  async dequeueLazyResolves() {
    for (const lazyResolve of this._lazyResolveQueue) {
      try {
        lazyResolve.resolve(await this._resolveBinding(lazyResolve.name, []));
      } catch (e) {
        /* istanbul ignore next -- @preserve */
        throw new Error(
          `Failed to resolve lazy binding ${lazyResolve.name}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  async resolve<T>(name: string) {
    if (this._constructing.includes(name)) {
      /* istanbul ignore next -- @preserve */
      throw new Error(`Circular dependency detected: ${[...this._constructing, name].join(" -> ")}`);
    }

    return this._resolveBinding<T>(name);
  }

  lazyResolve<T>(name: string) {
    const state: { value?: T; resolved: boolean } = { resolved: false };

    this._lazyResolveQueue.push({
      name,
      resolve: (v: unknown) => {
        state.value = v as T;
        state.resolved = true;
      },
    });

    return {
      get value(): T {
        if (!state.resolved) {
          throw new Error(
            `Lazy binding is not yet resolved. Avoid accessing it before container construction finishes.`,
          );
        }

        return state.value!;
      },
    };
  }

  async dispose() {
    let errorCount = 0;
    let errorMsg = "";

    for (const [name, instance] of this._singletons) {
      /* istanbul ignore if -- @preserve */
      if (typeof (instance as Disposable).dispose === "function") {
        try {
          await (instance as Disposable).dispose();
        } catch (err) {
          errorCount++;
          errorMsg += `${name}: ${err instanceof Error ? err.message : err}; `;
        }
      }
    }

    this._singletons.clear();

    if (errorCount > 0) {
      throw new Error(`Failed to dispose ${errorCount} binding(s):\n${errorMsg.slice(0, -2)}`);
    }
  }
}
