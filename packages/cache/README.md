# Resolid: Cache Package

![GitHub License](https://img.shields.io/github/license/resolid/framework)
![NPM Version](https://img.shields.io/npm/v/%40resolid/cache)

<b>[Documentation](https://www.resolid.tech/docs/cache)</b> | [Framework Bundle](https://github.com/resolid/framework)

## Type-safe Async Cache for TypeScript

A fully-typed, flexible cache system for modern TypeScript projects.
Supports single and batch operations, optional TTL, and pluggable storage backends.
Designed for libraries, frameworks, and applications needing predictable async caching.

### Feature

- Fully typed with TypeScript — no `any`.
- Supports get/set/del/clear operations.
- Supports batch operations: getMultiple, setMultiple, delMultiple.
- Optional TTL for automatic expiration.
- Pluggable store backend (default is `nullCache`).
- Detects existence of keys via `has`.
- Handles disposal of resources via `dispose`.

### Installation

```shell
pnpm add @resolid/cache
# or
npm install @resolid/cache
# or
yarn add @resolid/cache
# or
bun add @resolid/cache
```

### Usage

```js
import { createCache } from "@resolid/cache";

const cache = createCache({ defaultTtl: 1000 });

// Single set/get
await cache.set("foo", { a: 1 });
const value = await cache.get("foo"); // -> { a: 1 }

// Check existence
const exists = await cache.has("foo"); // -> true

// Batch set/get
await cache.setMultiple({ key1: 1, key2: 2 });
const values = await cache.getMultiple(["key1", "key2"]); // -> [1, 2]

// Delete
await cache.del("foo");
await cache.delMultiple(["key1", "key2"]);

// Clear all
await cache.clear();

// Dispose store if necessary
await cache.dispose();
```

### Options

```ts
export type CreateCacheOptions = {
  store?: CacheStore; // Custom storage backend
  defaultTtl?: number; // Default TTL in seconds
};
```

### Store Interface

Your custom store should implement `CacheStore`:

```ts
export interface CacheStore {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string, ttl?: number): Promise<boolean>;
  del(key: string): Promise<boolean>;
  clear(): Promise<boolean>;

  getMultiple?(keys: string[]): Promise<(string | undefined)[]>;
  setMultiple?(values: Record<string, string>, ttl?: number): Promise<boolean>;
  delMultiple?(keys: string[]): Promise<boolean>;
  has?(key: string): Promise<boolean>;
  dispose?(): Promise<void> | void;
}
```

## License

MIT License (MIT). Please see [LICENSE](./LICENSE) for more information.
