# Redis Cache store for @resolid/cache

![GitHub License](https://img.shields.io/github/license/resolid/framework)
![NPM Version](https://img.shields.io/npm/v/%40resolid/cache-redis)

<b>[Documentation](https://www.resolid.tech/docs/cache)</b> | [Framework Bundle](https://github.com/resolid/framework)

Redis store for @resolid/cache

## Features

- Built on top of @redis/client.
- TTL is handled directly by Redis.
- Supports Redis Clusters.
- Url connection string support or pass in your Redis Options

## Installation

```shell
pnpm add @resolid/cache @resolid/cache-redis
# or
npm install @resolid/cache @resolid/cache-redis
# or
yarn add @resolid/cache @resolid/cache-redis
# or
bun add @resolid/cache @resolid/cache-redis
```

## Usage

```ts
import { Cacher } from "@resolid/cache";
import { RedisCache } from "@resolid/cache-redis";

const cache = new Cacher({
  store: new RedisCache("redis://user:pass@localhost:6379"),
  defaultTtl: 1000,
});
```

## License

MIT License (MIT). Please see [LICENSE](./LICENSE) for more information.
