# Logging module for Resolid applications

![GitHub License](https://img.shields.io/github/license/resolid/framework)
![NPM Version](https://img.shields.io/npm/v/%40resolid/app-log)

<b>[Documentation](https://www.resolid.tech/docs/log)</b> | [Framework Bundle](https://github.com/resolid/framework)

## Installation

```shell
pnpm add @resolid/app-log
# or
npm install @resolid/app-log
# or
yarn add @resolid/app-log
# or
bun add @resolid/app-log
```

## Usage

```ts
import { createApp } from "@resolid/app";
import { createLogExtension, LogService } from "@resolid/app-log";

const app = await createApp({
  name: "App",
  extensions: [createLogExtension()],
  expose: {
    logger: LogService,
  },
});

app.$.logger.category("user").info("message");
```

Use `targets` to register sinks and `defaultTarget` to choose where the default category writes:

```ts
import { rotatingFileTarget } from "@resolid/app-log/targets";

createLogExtension({
  targets: {
    app: (ctx) => rotatingFileTarget(ctx, "app"),
  },
  defaultTarget: "app",
});
```

> For more information, see the official Logtape website: [https://logtape.org](https://logtape.org)

## Acknowledgment

- [logtape](https://github.com/dahlia/logtape)

## License

MIT License (MIT). Please see [LICENSE](./LICENSE) for more information.
