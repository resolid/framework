import type { BindingConfig, Scope } from "../types";
import { type Disposable, formatChain, isDisposable } from "../utils";

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
  const result = _createContainer();

  return {
    bind: result.bind,
    resolve: result.resolve,
    lazyResolve: result.lazyResolve,
    dispose: result.dispose,
  };
};

type CreateContainerResult = Container & {
  bindings: Map<symbol, Binding>;
  singletons: Map<symbol, unknown>;
  constructing: symbol[];
  dequeueLazyResolves: () => Promise<void>;
};

const _createContainer = (parent?: CreateContainerResult, item?: symbol, constructing?: symbol[]) => {
  const bindings: CreateContainerResult["bindings"] = parent?.bindings ?? new Map();
  const singletons: CreateContainerResult["singletons"] = parent?.singletons ?? new Map();
  const currentConstructing: CreateContainerResult["constructing"] = item
    ? [...(constructing ?? parent?.constructing ?? []), item]
    : [];

  const lazyResolveQueue: { name: symbol; resolve: (value: unknown) => void }[] = [];

  const container = {} as unknown as CreateContainerResult;

  const enqueueLazyResolve = (name: symbol) => {
    return new Promise((resolve) => {
      const lazy = (value: unknown) => {
        resolve(value);
      };

      lazyResolveQueue.push({
        name,
        resolve: lazy,
      });
    });
  };

  const dequeueLazyResolves = async () => {
    for (const lazyResolve of lazyResolveQueue) {
      try {
        lazyResolve.resolve(await resolveBinding(lazyResolve.name, []));
      } catch (e) {
        throw new Error(
          `Failed to resolve lazy resolver for name ${lazyResolve.name.toString()}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  };

  const bind = (name: symbol) => {
    const toValue: ToValue = (value) => {
      bindings.set(name, { factory: () => value, scope: "singleton" });
    };

    const toFunction: ToFunction = (fn) => {
      bindings.set(name, { factory: () => fn, scope: "singleton" });
    };

    const toFactory: ToFactory = (fn, options?) => {
      bindings.set(name, {
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
  };

  const resolveBinding = async <T>(name: symbol, constructing?: symbol[]) => {
    const binding = bindings.get(name);

    if (!binding) {
      throw new Error(`No binding found for name: ${name.toString()}`);
    }

    const isSingleton = binding.scope === "singleton";

    if (isSingleton && singletons.has(name)) {
      return singletons.get(name) as T;
    }

    const child = _createContainer(container, name, constructing);

    const result = await binding.factory(child.resolve, child.lazyResolve);

    if (isSingleton) {
      singletons.set(name, result);
    }

    await child.dequeueLazyResolves();

    return result as T;
  };

  const resolve = async <T>(name: symbol): Promise<T> => {
    if (currentConstructing.includes(name)) {
      throw new Error(`Circular dependency detected: ${formatChain(currentConstructing, name)}`);
    }

    return resolveBinding(name);
  };

  const lazyResolve = <T>(name: symbol): Readonly<{ value: T }> => {
    let value: T | undefined;

    enqueueLazyResolve(name).then((resolved) => {
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
  };

  const dispose = async () => {
    const disposeErrors: Array<{ name: symbol; error: unknown }> = [];

    for (const [name, instance] of singletons) {
      if (isDisposable(instance)) {
        try {
          await instance.dispose();
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
  };

  Object.assign(container, {
    bindings,
    singletons,
    constructing: currentConstructing,
    dequeueLazyResolves,
    bind,
    resolve,
    lazyResolve,
    dispose,
  });

  return container;
};
