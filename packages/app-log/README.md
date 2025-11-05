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
import { createApp } from "@resolid/core";
import { createLogExtension, type LogConfig, LogService } from "@resolid/app-log";

const logConfig: LogConfig = {};

const app = createApp<{
  logger: LogService;
}>({
  name: "App",
  extensions: [createLogExtension(logConfig)],
  expose: {
    logger: {
      token: LogService,
      async: true,
    },
  },
});

app.$.logger.category("user").info("message");
```

> For more information, see the official Logtape website: [https://logtape.org](https://logtape.org)

## Acknowledgment

- [logtape](https://github.com/dahlia/logtape)

## License

MIT License (MIT). Please see [LICENSE](./LICENSE) for more information.
