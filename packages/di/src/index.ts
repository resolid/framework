type Resolve = <T>(name: symbol) => T | Promise<T>;
type LazyResolve = <T = unknown>(name: symbol) => Readonly<{ value: T }>;

export type Scope = "singleton" | "transient";

export type Resolver = {
  resolve: Resolve;
  lazyResolve: LazyResolve;
};

export type FactoryConfig = Record<string, unknown>;

export type BindingDefinition<T = unknown, Config extends FactoryConfig = FactoryConfig> =
  | { name: symbol; value: T; callable?: never; factory?: never; scope?: never; config?: never }
  | {
      name: symbol;
      callable: (...args: unknown[]) => T;
      value?: never;
      factory?: never;
      scope?: never;
      config?: never;
    }
  | {
      name: symbol;
      factory: (options: { resolver: Resolver; config?: Config }) => T | Promise<T>;
      scope?: Scope;
      config?: Config;
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
  const container = new DIContainer();

  container.register(definitions);

  return {
    resolve: <T>(name: symbol) => container.resolve<T>(name),
    dispose: () => container.dispose(),
  };
};

class DIContainer {
  readonly #bindings: Map<
    symbol,
    {
      factory: (resolve: Resolve, lazyResolve: LazyResolve) => unknown | Promise<unknown>;
      scope: Scope;
      config?: unknown;
    }
  >;
  readonly #singletons: Map<symbol, unknown>;
  readonly #constructing: symbol[];
  readonly #lazyResolveQueue: { name: symbol; resolve: (value: unknown) => void }[] = [];

  constructor(parent?: DIContainer, item?: symbol, constructing?: symbol[]) {
    this.#bindings = parent?.getBindings() ?? new Map();
    this.#singletons = parent?.getSingletons() ?? new Map();
    /* istanbul ignore next -- @preserve */
    this.#constructing = item ? [...(constructing ?? parent?.getConstructing() ?? []), item] : [];
  }

  getBindings() {
    return this.#bindings;
  }

  getSingletons() {
    return this.#singletons;
  }

  getConstructing() {
    return this.#constructing;
  }

  register(definitions: readonly BindingDefinition[]) {
    for (const definition of definitions) {
      if (definition.callable) {
        this.#bindings.set(definition.name, {
          factory: () => definition.callable,
          scope: "singleton",
        });
      } else if (definition.factory) {
        this.#bindings.set(definition.name, {
          factory: (resolve, lazyResolve) =>
            definition.factory({ resolver: { resolve, lazyResolve }, config: definition.config }),
          scope: definition.scope ?? "singleton",
          config: definition.config,
        });
      } else {
        this.#bindings.set(definition.name, {
          factory: () => definition.value,
          scope: "singleton",
        });
      }
    }
  }

  async #resolveBinding<T>(name: symbol, constructing?: symbol[]) {
    const binding = this.#bindings.get(name);

    if (!binding) {
      /* istanbul ignore next -- @preserve */
      throw new Error(`No binding found for ${name.description ?? name.toString()}.`);
    }

    const isSingleton = binding.scope === "singleton";

    if (isSingleton && this.#singletons.has(name)) {
      return this.#singletons.get(name) as T;
    }

    const child = new DIContainer(this, name, constructing);

    const result = await binding.factory(
      (n: symbol) => child.resolve(n),
      (n: symbol) => child.lazyResolve(n),
    );

    if (isSingleton) {
      this.#singletons.set(name, result);
    }

    await child.dequeueLazyResolves();

    return result as T;
  }

  async dequeueLazyResolves() {
    for (const lazyResolve of this.#lazyResolveQueue) {
      try {
        lazyResolve.resolve(await this.#resolveBinding(lazyResolve.name, []));
      } catch (e) {
        /* istanbul ignore next -- @preserve */
        throw new Error(
          `Failed to resolve lazy binding ${lazyResolve.name.description ?? lazyResolve.name.toString()}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  async resolve<T>(name: symbol) {
    if (this.#constructing.includes(name)) {
      /* istanbul ignore next -- @preserve */
      throw new Error(
        `Circular dependency detected: ${[...this.#constructing, name].map((s) => s.description ?? s.toString()).join(" -> ")}`,
      );
    }

    return this.#resolveBinding<T>(name);
  }

  lazyResolve<T>(name: symbol) {
    let value: T | undefined;

    new Promise((resolve) => {
      this.#lazyResolveQueue.push({
        name,
        resolve: (value: unknown) => {
          resolve(value);
        },
      });
    }).then((resolved) => {
      value = resolved as T;
    });

    return {
      get value(): T {
        if (!value) {
          throw new Error(
            `Lazy binding is not yet resolved. Avoid accessing it before container construction finishes.`,
          );
        }

        return value;
      },
    };
  }

  async dispose() {
    const errors: Array<{ name: symbol; error: unknown }> = [];

    for (const [name, instance] of this.#singletons) {
      /* istanbul ignore else -- @preserve */
      if (typeof (instance as Disposable).dispose === "function") {
        try {
          await (instance as Disposable).dispose();
        } catch (error) {
          errors.push({ name, error });
        }
      }
    }

    this.#singletons.clear();

    if (errors.length > 0) {
      const messages = errors
        .map(
          ({ name, error }) =>
            /* istanbul ignore next -- @preserve */
            `${name.description ?? name.toString()}: ${error instanceof Error ? error.message : String(error)}`,
        )
        .join("; ");

      throw new Error(`Failed to dispose ${errors.length} binding(s):\n${messages}`);
    }
  }
}
