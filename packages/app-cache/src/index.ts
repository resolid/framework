import type { AppContext, ExtensionCreator } from "@resolid/app";
import { Cacher, type CacheSerializer } from "@resolid/cache";
import { NullCache, type CacheStore } from "@resolid/cache/stores";

export { NullCache, MemoryCache, type CacheStore } from "@resolid/cache/stores";

export type CacheServiceConfig = {
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
      throw new Error(`Cache with name "${name}" does not exist.`);
    }

    return cache;
  }

  async dispose(): Promise<void> {
    const caches = [...this._caches.values()];

    this._caches.clear();

    await Promise.all(caches.map((cache) => cache.dispose()));
  }
}

type StoreFactory = (ctx: AppContext) => CacheStore;

type CacheExtensionBaseConfig = {
  defaultTtl?: number;
  serializer?: CacheSerializer;
};

type CacheExtensionConfigWithStore = {
  store?: StoreFactory | CacheStore;
  stores?: never;
  defaultCache?: never;
} & CacheExtensionBaseConfig;

type CacheExtensionConfigWithStores = {
  store?: never;
  stores: Record<string, StoreFactory | CacheStore>;
  defaultCache?: string;
} & CacheExtensionBaseConfig;

export type CacheExtensionConfig = CacheExtensionConfigWithStore | CacheExtensionConfigWithStores;

const SINGLE_STORE_NAME = "main";

export function createCacheExtension(config: CacheExtensionConfig = {}): ExtensionCreator {
  const { store, stores, defaultCache, defaultTtl, serializer } = config;

  const cacheNames = stores ? Object.keys(stores) : [SINGLE_STORE_NAME];

  if (cacheNames.length === 0) {
    throw new Error("createCacheExtension requires at least one store.");
  }

  const resolvedDefaultCache = defaultCache ?? cacheNames[0]!;

  if (!cacheNames.includes(resolvedDefaultCache)) {
    throw new Error(
      `Default cache "${resolvedDefaultCache}" does not exist. Available caches: ${cacheNames.join(", ")}.`,
    );
  }

  return (ctx) => ({
    name: "resolid-cache-module",
    providers: [
      {
        token: CacheService,
        factory() {
          const caches: Map<string, Cacher> = new Map();

          const entries: [string, StoreFactory | CacheStore][] = stores
            ? Object.entries(stores)
            : [[SINGLE_STORE_NAME, store ?? new NullCache()]];

          for (const [name, store] of entries) {
            caches.set(
              name,
              new Cacher({
                store: typeof store === "function" ? store(ctx) : store,
                defaultTtl,
                serializer,
              }),
            );
          }

          return new CacheService({ caches, defaultCache: resolvedDefaultCache });
        },
      },
    ],
  });
}
