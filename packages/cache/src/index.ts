import type { CacheStore } from "./stores/types";
import { NullCache } from "./stores/null-cache";
import { normalizeKey } from "./utils";

type Serializer = {
  serialize: <T = unknown>(value: T) => string;
  deserialize: <T = unknown>(value: string) => T;
};

export interface CacheOptions {
  store?: CacheStore;
  serializer?: Serializer;
  defaultTtl?: number;
}

export class Cacher {
  private readonly _store: CacheStore;
  private readonly _serializer: Serializer;
  private readonly _defaultTtl?: number;

  constructor({
    store = new NullCache(),
    serializer = { serialize: JSON.stringify, deserialize: JSON.parse },
    defaultTtl,
  }: CacheOptions = {}) {
    this._store = store;
    this._serializer = serializer;
    this._defaultTtl = defaultTtl;
  }

  async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const value = await this._store.get(normalizeKey(key));

    return value === undefined ? defaultValue : this._serializer.deserialize<T>(value);
  }

  set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    return this._store.set(
      normalizeKey(key),
      this._serializer.serialize(value),
      ttl ?? this._defaultTtl,
    );
  }

  del(key: string): Promise<boolean> {
    return this._store.del(normalizeKey(key));
  }

  clear(): Promise<boolean> {
    return this._store.clear();
  }

  async getMultiple<T>(keys: string[], defaultValue?: T): Promise<(T | undefined)[]> {
    if (this._store.getMultiple) {
      return (await this._store.getMultiple(keys.map(normalizeKey))).map((v) =>
        v === undefined ? defaultValue : this._serializer.deserialize<T>(v),
      );
    }

    return Promise.all(keys.map((k) => this.get<T>(k, defaultValue)));
  }

  async setMultiple<T>(values: Record<string, T>, ttl?: number): Promise<boolean> {
    if (this._store.setMultiple) {
      return this._store.setMultiple(
        Object.entries(values).reduce(
          (acc, [k, v]) => {
            acc[normalizeKey(k)] = this._serializer.serialize(v);
            return acc;
          },
          {} as Record<string, string>,
        ),
        ttl,
      );
    }

    return (await Promise.all(Object.entries(values).map(([k, v]) => this.set(k, v, ttl)))).every(
      Boolean,
    );
  }

  async delMultiple(keys: string[]): Promise<boolean> {
    if (this._store.delMultiple) {
      return this._store.delMultiple(keys.map(normalizeKey));
    }

    return (await Promise.all(keys.map((k) => this.del(k)))).every(Boolean);
  }

  async has(key: string): Promise<boolean> {
    return this._store.has
      ? this._store.has(normalizeKey(key))
      : (await this.get(key)) !== undefined;
  }

  async dispose(): Promise<void> {
    await this._store.dispose?.();
  }
}
