# Resolid: DI Container Package

![GitHub License](https://img.shields.io/github/license/resolid/framework)

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

### Usage

#### Creating a container

```js
import { createContainer } from "@resolid/di";

const container = createContainer();
```

#### Binding dependencies

You can bind values, functions, or factories:

1. Bind a value

```js
const TOKEN = Symbol("token");

container.bind(TOKEN).toValue({ message: "Hello World" });

const result = await container.resolve(TOKEN); // result = "Hello World"
```

2. Bind a function

```js
const FUNC_TOKEN = Symbol("func");

container.bind(FUNC_TOKEN).toFunction(() => console.log("Hello from function"));

const fn = await container.resolve(FUNC_TOKEN);
const result = fn(); // result = "Hello from function"
```

3. Bind a factory

Bind a factory, can with bellow options:

- scope
  - singleton (default): One instance per container.
  - transient: A new instance each time resolved.

- config is optional

```js
const TOKEN = Symbol("token");

container.bind(TOKEN).toValue({ message: "Hello" });

const FACTORY_TOKEN = Symbol("factory");

container.bind(FACTORY_TOKEN).toFactory(
  ({ resolver, config }) => {
    const dep = resolver.resolve(TOKEN);
    return `Factory resolved: ${dep.message} ${config.message}`;
  },
  { scope: "singleton", config: { message: "World." } },
);

const result = await container.resolve(FACTORY_TOKEN); // result = "Factory resolved: Hello world."
```

4. Circular dependencies

```js
const LAZY_DEP = Symbol("lazyDep");
const CONSUMER = Symbol("consumer");

container.bind(LAZY_DEP).toValue({ data: "lazy data" });

container.bind(CONSUMER).toFactory(({ resolver }) => {
  const lazy = resolver.lazyResolve(LAZY_DEP);

  return {
    getLazyData: () => lazy.value.data,
  };
});

const consumer = await container.resolve(CONSUMER);
// consumer.getLazyData()).toBe("lazy data");
```

## License

MIT License (MIT). Please see [LICENSE](./LICENSE) for more information.
