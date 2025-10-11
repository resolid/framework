import type { BindingConfig, Scope } from "../types";

type Resolve = (name: symbol) => unknown;
type LazyResolve = <T = unknown>(name: symbol) => Readonly<{ value: T }>;

type Binding<Config extends BindingConfig = BindingConfig> = {
  factory: (resolve: Resolve, lazyResolve: LazyResolve) => unknown | Promise<unknown>;
  scope: Scope;
  config?: Config;
};

type Resolver = {
  resolve: Resolve;
  lazyResolve: LazyResolve;
};

type ToValue = (value: unknown) => void;

type ToFunction = (fn: (...args: unknown[]) => unknown) => void;

type ToFactory = (
  fn: ({ resolver, config }: { resolver: Resolver; config?: BindingConfig }) => unknown | Promise<unknown>,
  options?: {
    scope?: Scope;
    config?: BindingConfig;
  },
) => void;

type Disposable = {
  dispose: () => Promise<void> | void;
};

export type Container = {
  bind: (name: symbol) => {
    toValue: ToValue;
    toFunction: ToFunction;
    toFactory: ToFactory;
  };
  resolve: <T>(name: symbol) => Promise<T>;
  lazyResolve: LazyResolve;
} & Disposable;

export const createContainer = (): Container => {
  const result = new DIContainer();

  return {
    bind: (name: symbol) => result.bind(name),
    resolve: <T>(name: symbol) => result.resolve<T>(name),
    lazyResolve: <T>(name: symbol) => result.lazyResolve<T>(name),
    dispose: () => result.dispose(),
  };
};

class DIContainer {
  readonly #bindings: Map<symbol, Binding>;
  readonly #singletons: Map<symbol, unknown>;
  readonly #constructing: symbol[];
  readonly #lazyResolveQueue: { name: symbol; resolve: (value: unknown) => void }[] = [];

  constructor(parent?: DIContainer, item?: symbol, constructing?: symbol[]) {
    this.#bindings = parent?.getBindings() ?? new Map();
    this.#singletons = parent?.getSingletons() ?? new Map();
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

  bind(name: symbol) {
    const toValue: ToValue = (value) => {
      this.#bindings.set(name, { factory: () => value, scope: "singleton" });
    };

    const toFunction: ToFunction = (fn) => {
      this.#bindings.set(name, { factory: () => fn, scope: "singleton" });
    };

    const toFactory: ToFactory = (fn, options?) => {
      this.#bindings.set(name, {
        factory: (resolve, lazyResolve) => {
          return fn({ resolver: { resolve, lazyResolve }, config: options?.config });
        },
        scope: options?.scope ?? "singleton",
        config: options?.config,
      });
    };

    return {
      toValue,
      toFunction,
      toFactory,
    };
  }

  async #resolveBinding<T>(name: symbol, constructing?: symbol[]) {
    const binding = this.#bindings.get(name);

    if (!binding) {
      throw new Error(`No binding found for name: ${name.toString()}`);
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
        throw new Error(
          `Failed to resolve lazy resolver for name ${lazyResolve.name.toString()}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  async resolve<T>(name: symbol) {
    if (this.#constructing.includes(name)) {
      throw new Error(`Circular dependency detected: ${[...this.#constructing, name].map(String).join(" -> ")}`);
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
            "Lazy binding is not yet resolved. Do not use lazy-resolved bindings before the binding construction ends.",
          );
        }

        return value;
      },
    };
  }

  async dispose() {
    const disposeErrors: Array<{ name: symbol; error: unknown }> = [];

    for (const [name, instance] of this.#singletons) {
      if (typeof (instance as Disposable).dispose === "function") {
        try {
          await (instance as Disposable).dispose();
        } catch (error) {
          disposeErrors.push({ name, error });
        }
      }
    }

    if (disposeErrors.length > 0) {
      const errorMessages = disposeErrors
        .map(({ name, error }) => `${name.toString()}: ${error instanceof Error ? error.message : String(error)}`)
        .join("; ");

      throw new Error(`Failed to dispose ${disposeErrors.length} binding(s): ${errorMessages}`);
    }
  }
}
