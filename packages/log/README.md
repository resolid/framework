# Logging module for Resolid applications

![GitHub License](https://img.shields.io/github/license/resolid/framework)
![NPM Version](https://img.shields.io/npm/v/%40resolid/log)

<b>[Documentation](https://www.resolid.tech/docs/log)</b> | [Framework Bundle](https://github.com/resolid/framework)

## Installation

```shell
pnpm add @resolid/log
# or
npm install @resolid/log
# or
yarn add @resolid/log
# or
bun add @resolid/log
```

### Usage

```ts
import { createApp } from "@resolid/core";
import { type LogConfig, createLogExtension, LogService } from "@resolid/log";

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

[logtape](https://github.com/dahlia/logtape)

## License

MIT License (MIT). Please see [LICENSE](./LICENSE) for more information.
