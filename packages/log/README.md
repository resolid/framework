# Resolid: Log Package

![GitHub License](https://img.shields.io/github/license/resolid/framework)
![NPM Version](https://img.shields.io/npm/v/%40resolid/log)

<b>[Documentation](https://www.resolid.tech/docs/log)</b> | [Framework Bundle](https://github.com/resolid/framework)

## TypeScript Logger with Channels and Context

A lightweight, DI-friendly logging library built on top of logtape
, providing simple channels, context support, and type-safe TypeScript integration.

### Features

- Simple **channel-based logging**
- 5 main log levels: `debug`, `info`, `warn`, `error`, `fatal`
- Supports **string, template literals, objects, and lazy callbacks**
- Fully **TypeScript typed** with auto-complete support
- **DI-friendly** extension for Resolid apps
- Optional **channel caching** for performance in high-frequency logging

### Installation

```shell
pnpm add @resolid/log
# or
npm install @resolid/log
# or
yarn add @resolid/log
# or
bun add @resolid/di
```

### Usage

```ts
import { createApp } from "@resolid/core";
import { LOG_SYMBOL, type LogConfig, logExtension, type LogService } from "@resolid/log";

const logConfig: LogConfig = {};

const { context } = createApp({
  name: "App",
  extensions: [[logExtension, logConfig]],
});

const { logger } = await context.resolve<LogService>(LOG_SYMBOL);

log.channel("user").info("message");
```

> For more information, see the official Logtape website: [https://logtape.org](https://logtape.org)

## Acknowledgment

[logtape](https://github.com/dahlia/logtape)

## License

MIT License (MIT). Please see [LICENSE](./LICENSE) for more information.
