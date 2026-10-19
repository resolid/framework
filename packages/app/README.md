# Application runtime for Resolid applications

![GitHub License](https://img.shields.io/github/license/resolid/framework)
![NPM Version](https://img.shields.io/npm/v/%40resolid/app)

<b>[Documentation](https://www.resolid.tech/docs)</b> | [Framework Bundle](https://github.com/resolid/framework)

The application runtime wires extensions, a dependency injection container, an event emitter and
path helpers into a single `app` object that every Resolid application shares.

## Features

- Fully typed, `expose` maps container tokens to `app.$` properties.
- Extensions bundle providers and an ordered `bootstrap` step.
- Bootstraps run once, in extension order, and concurrent `run()` calls share a single start.
- Disposal waits for an in-flight start, runs once even when called concurrently, and disposes every
  singleton in reverse creation order. A disposed app refuses to run again.
- Hot reload disposes the previous app before creating the new one.
- `rootPath` and `runtimePath` resolve paths relative to the working directory.
- `loadProviders` auto-registers class exports from `import.meta.glob` bundles.

## Installation

```shell
pnpm add @resolid/app
# or
npm install @resolid/app
# or
yarn add @resolid/app
# or
bun add @resolid/app
```

## Usage

```ts
import { createApp, inject, loadProviders } from "@resolid/app";

class GreeterService {
  greet(name: string) {
    return `Hello, ${name}!`;
  }
}

const app = await createApp({
  name: "App",
  debug: true,
  timezone: "Asia/Shanghai",
  extensions: [
    {
      name: "greeting",
      bootstrap: ({ name }) => {
        console.log(`${name} is booting.`);
      },
    },
  ],
  providers: loadProviders([{ GreeterService }]),
  expose: {
    greeter: GreeterService,
  },
});

app.emitter.on("app:ready", ({ name }) => {
  console.log(`${name} is ready.`);
});

await app.run();

app.$.greeter.greet("World");
app.get(GreeterService).greet("World");

await app.dispose();
```

### Extensions

An extension is an object, or a factory that receives the `AppContext` and returns one. Providers
are registered in declaration order and bootstraps run sequentially in the same order, so a later
extension can rely on an earlier one having started.

```ts
import type { ExtensionCreator } from "@resolid/app";

const createGreetingExtension = (message: string): ExtensionCreator => {
  return ({ name, container }) => ({
    name: `greeting:${name}`,
    providers: [{ token: GreetingConfig, factory: () => ({ message }) }],
    bootstrap: () => {
      console.log(`Booting ${container.get(GreetingConfig).message}`);
    },
  });
};
```

### Injecting dependencies

`inject` resolves a token inside a factory or an injected constructor, which keeps services free of
the container itself.

```ts
import { inject } from "@resolid/app";

class UserService {
  private readonly greeter = inject(GreeterService);

  welcome(name: string) {
    return this.greeter.greet(name);
  }
}
```

### Paths

```ts
app.rootPath("config", "app.json"); // <cwd>/config/app.json
app.runtimePath("cache"); // <cwd>/runtime/cache
```

### Auto-registering providers

`loadProviders` turns every capitalized class export into a provider, and keeps explicit
`{ token, factory }` objects as they are. It is meant for eager `import.meta.glob` bundles of
repositories and services.

```ts
const providers = loadProviders(
  Object.values(
    import.meta.glob(["./**/repository.server.ts", "./**/service.server.ts"], {
      base: "../modules",
      import: "*",
      eager: true,
    }),
  ),
);
```

### Timezone

The effective timezone is resolved as `timezone` option → existing `TZ` environment variable → `UTC`,
applied to the process through `env.TZ`, and exposed on `app.timezone`. This keeps development and
production consistent by default while still honoring a `TZ` that the environment already sets.

## License

MIT License (MIT). Please see [LICENSE](./LICENSE) for more information.
