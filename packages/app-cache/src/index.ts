import type { AppContext, ExtensionCreator } from "@resolid/core";
import { Cacher, type CacheSerializer } from "@resolid/cache";
import { NullCache, MemoryCache, type CacheStore } from "@resolid/cache/stores";

type CacheServiceConfig = {
  caches: Map<string, Cacher>;
  defaultCache: string;
};

export class CacheService {
  private readonly _caches: Map<string, Cacher>;
  private readonly _defaultCache: string;

  readonly get: Cacher["get"];
  readonly set: Cacher["set"];
  readonly del: Cacher["del"];
  readonly clear: Cacher["clear"];
  readonly has: Cacher["has"];
  readonly getMultiple: Cacher["getMultiple"];
  readonly setMultiple: Cacher["setMultiple"];
  readonly delMultiple: Cacher["delMultiple"];
  readonly getOrSet: Cacher["getOrSet"];

  constructor({ caches, defaultCache }: CacheServiceConfig) {
    this._caches = caches;
    this._defaultCache = defaultCache;

    this.get = (...args) => this.use().get(...args);
    this.set = (...args) => this.use().set(...args);
    this.del = (...args) => this.use().del(...args);
    this.clear = (...args) => this.use().clear(...args);
    this.has = (...args) => this.use().has(...args);
    this.getMultiple = (...args) => this.use().getMultiple(...args);
    this.setMultiple = (...args) => this.use().setMultiple(...args);
    this.delMultiple = (...args) => this.use().delMultiple(...args);
    this.getOrSet = (...args) => this.use().getOrSet(...args);
  }

  use(name: string = this._defaultCache): Cacher {
    const cache = this._caches.get(name);

    if (!cache) {
      throw new Error(`Cache with name ${String(name)} does not exist.`);
    }

    return cache;
  }

  async dispose(): Promise<void> {
    for (const cache of this._caches.values()) {
      // oxlint-disable-next-line no-await-in-loop
      await cache.dispose();
    }

    this._caches.clear();
  }
}

type CacheExtensionBaseConfig = {
  defaultTtl?: number;
  serializer?: CacheSerializer;
};

type CacheExtensionConfigWithStore = {
  store?: ((ctx: AppContext) => CacheStore) | CacheStore;
  stores?: never;
  defaultStore?: never;
} & CacheExtensionBaseConfig;

type CacheExtensionConfigWithStores = {
  store?: never;
  stores: Record<string, ((ctx: AppContext) => CacheStore) | CacheStore>;
  defaultStore?: string;
} & CacheExtensionBaseConfig;

export type CacheExtensionConfig = CacheExtensionConfigWithStore | CacheExtensionConfigWithStores;

export function createCacheExtension({
  store = new NullCache(),
  stores,
  defaultStore = "main",
  defaultTtl,
  serializer,
}: CacheExtensionConfig = {}): ExtensionCreator {
  return (ctx) => {
    return {
      name: "resolid-cache-module",
      providers: [
        {
          token: CacheService,
          factory() {
            const caches: Map<string, Cacher> = new Map();

            for (const [name, s] of stores
              ? Object.entries(stores)
              : [[defaultStore, store] as const]) {
              caches.set(
                name,
                new Cacher({
                  store: typeof s === "function" ? s(ctx) : s,
                  defaultTtl,
                  serializer,
                }),
              );
            }

            return new CacheService({ caches, defaultCache: defaultStore });
          },
        },
      ],
    };
  };
}

export { NullCache, MemoryCache, type CacheStore };
