# File Cache store for @resolid/cache

![GitHub License](https://img.shields.io/github/license/resolid/framework)
![NPM Version](https://img.shields.io/npm/v/%40resolid/cache-file)

<b>[Documentation](https://www.resolid.tech/docs/cache)</b> | [Framework Bundle](https://github.com/resolid/framework)

A simple file-based cache implementation for Node.js with TTL support and concurrency-safe locks.

## Installation

```shell
pnpm add @resolid/cache @resolid/cache-file
# or
npm install @resolid/cache @resolid/cache-file
# or
yarn add @resolid/cache @resolid/cache-file
# or
bun add @resolid/cache @resolid/cache-file
```

## Usage

```ts
import { Cacher } from "@resolid/cache";
import { FileCache } from "@resolid/cache";

const cache = new Cacher({ store: new FileCache("./.tmp/cache"), defaultTtl: 1000 });
```

## License

MIT License (MIT). Please see [LICENSE](./LICENSE) for more information.
