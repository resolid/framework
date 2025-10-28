import { destr } from "destr";
import { NullCache } from "./stores/null-cache";
import type { CacheStore } from "./types";
import { normalizeKey } from "./utils";

export interface CacheOptions {
  store?: CacheStore;
  defaultTtl?: number;
}

export class Cacher {
  private readonly store: CacheStore;
  private readonly defaultTtl?: number;

  constructor({ store = new NullCache(), defaultTtl }: CacheOptions = {}) {
    this.store = store;
    this.defaultTtl = defaultTtl;
  }

  async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const value = await this.store.get(normalizeKey(key));

    return value === undefined ? defaultValue : destr<T>(value);
  }

  set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    return this.store.set(normalizeKey(key), JSON.stringify(value), ttl ?? this.defaultTtl);
  }

  del(key: string): Promise<boolean> {
    return this.store.del(normalizeKey(key));
  }

  clear(): Promise<boolean> {
    return this.store.clear();
  }

  async getMultiple<T>(keys: string[], defaultValue?: T): Promise<(T | undefined)[]> {
    if (this.store.getMultiple) {
      const values = await this.store.getMultiple(keys.map(normalizeKey));

      return values.map((v) => (v === undefined ? defaultValue : destr<T>(v)));
    }
    return Promise.all(keys.map((k) => this.get<T>(k, defaultValue)));
  }

  async setMultiple<T>(values: Record<string, T>, ttl?: number): Promise<boolean> {
    if (this.store.setMultiple) {
      const normalized = Object.entries(values).reduce(
        (acc, [k, v]) => {
          acc[normalizeKey(k)] = JSON.stringify(v);
          return acc;
        },
        {} as Record<string, string>,
      );

      return this.store.setMultiple(normalized, ttl);
    }

    return (await Promise.all(Object.entries(values).map(([k, v]) => this.set(k, v, ttl)))).every(Boolean);
  }

  async delMultiple(keys: string[]): Promise<boolean> {
    if (this.store.delMultiple) {
      return this.store.delMultiple(keys.map(normalizeKey));
    }

    return (await Promise.all(keys.map((k) => this.del(k)))).every(Boolean);
  }

  async has(key: string): Promise<boolean> {
    return this.store.has ? this.store.has(normalizeKey(key)) : (await this.get(key)) !== undefined;
  }

  async dispose(): Promise<void> {
    await this.store.dispose?.();
  }
}
