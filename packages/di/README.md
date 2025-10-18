# Resolid: DI Container Package

![GitHub License](https://img.shields.io/github/license/resolid/framework)
![NPM Version](https://img.shields.io/npm/v/%40resolid/di)

<b>[Documentation](https://www.resolid.tech/docs/di)</b> | [Framework Bundle](https://github.com/resolid/framework)

## TypeScript Dependency Injection Container

A lightweight, fully-typed Dependency Injection (DI) container for TypeScript.
Supports singleton & transient scopes, lazy resolution, and disposable resources. Fully functional with async factories
and avoids circular dependency issues.

### Features

- Fully typed with TypeScript, no any.
- Supports singleton and transient scopes.
- Lazy resolution for async dependencies.
- Detects circular dependencies.
- Handles disposable instances with dispose() support.
- Fully async-compatible.

### Installation

```shell
pnpm add @resolid/di
# or
npm install @resolid/di
# or
yarn add @resolid/di
# or
bun add @resolid/di
```

### Basic Usage

```js
import { createContainer } from "@resolid/di";

const VALUE = "VALUE";
const FUNCTION = "FUNCTION";
const FACTORY = "FACTORY";

const container = createContainer([
  { name: VALUE, value: "Hello World" },
  {
    name: FUNCTION,
    callable: () => {
      return "Hello World from callable";
    },
  },
  {
    name: FACTORY,
    factory: async ({ resolver, config }) => {
      const value = await resolver.resolve(VALUE);

      return value + " " + config.message || "from factory!";
    },
    /**
     * Scope of a binding.
     * singleton (default): Only one instance is created and shared for all resolves.
     * transient: A new instance is created on each resolve.
     */
    scope: "singleton",
    /**
     * Optional configuration object passed to a factory.
     * Type is inferred from the factory definition.
     * Used to provide parameters for instance creation.
     */
    config: { message: " from factory with config" },
  },
]);

const valueResult = await container.resolve(VALUE);
console.log(valueResult); // Output: "Hello World"

const callable = await container.resolve(FUNCTION);
const callableResult = callable();
console.log(callableResult); // Output: "Hello World from callable"

const factoryResult = await container.resolve(FACTORY);
console.log(factoryResult); // Output: "Hello World from factory with config"
```

### Lazy Resolve

You can create bindings that are resolved lazily, useful for circular dependencies or heavy computations:

```js
const LAZY_A = "LAZY_A";
const LAZY_B = "LAZY_B";

const container = createContainer([
  {
    name: LAZY_A,
    factory: ({ resolver }) => {
      const b = resolver.lazyResolve(LAZY_B);
      return `A depends on ${b.value}`;
    },
  },
  {
    name: LAZY_B,
    factory: ({ resolver }) => {
      const a = resolver.lazyResolve(LAZY_A);
      return `B depends on ${a.value}`;
    },
  },
]);

// Accessing value after construction is safe
await container.resolve(LAZY_A);
await container.resolve(LAZY_B);
```

> Note: Access `lazyResolve.value` **only after all bindings are constructed**, otherwise it will throw an error.

### Circular Dependency Detection

```js
const A = "A";
const B = "B";

const container = createContainer([
  {
    name: A,
    factory: ({ resolver }) => resolver.resolve(B),
  },
  {
    name: B,
    factory: ({ resolver }) => resolver.resolve(A),
  },
]);

await container.resolve(A);
// Throws Error: Circular dependency detected: A -> B -> A
```

### Dispose

```js
class Resource {
  async dispose() {
    console.log("Resource disposed");
  }
}

const RESOURCE = "RESOURCE";

const container = createContainer([{ name: RESOURCE, value: new Resource() }]);

// Dispose all singleton instances
await container.dispose();
// Output: "Resource disposed"
```

## License

MIT License (MIT). Please see [LICENSE](./LICENSE) for more information.
