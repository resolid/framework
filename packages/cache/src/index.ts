import { destr } from "destr";
import { nullCache } from "./stores/null-cache";
import type { CacheStore } from "./types";
import { normalizeKey } from "./utils";

export type CreateCacheOptions = {
  store?: CacheStore;
  defaultTtl?: number;
};

export type CacheInstance = {
  get: <T>(key: string, defaultValue?: T) => Promise<T | undefined>;
  set: <T>(key: string, value: T, ttl?: number) => Promise<boolean>;
  del: (key: string) => Promise<boolean>;
  clear: () => Promise<boolean>;

  getMultiple: <T>(keys: string[], defaultValue?: T) => Promise<(T | undefined)[]>;
  setMultiple: <T>(values: Record<string, T>, ttl?: number) => Promise<boolean>;
  delMultiple: (keys: string[]) => Promise<boolean>;
  has: (key: string) => Promise<boolean>;

  dispose: () => Promise<void> | void;
};

export const createCache = (options: CreateCacheOptions = {}): CacheInstance => {
  const { defaultTtl, store = nullCache } = options;

  const get: CacheInstance["get"] = async <T>(key: string, defaultValue: T | undefined) => {
    const value = await store.get(normalizeKey(key));

    if (value === undefined) {
      return defaultValue;
    }

    return destr<T>(value);
  };

  const set: CacheInstance["set"] = (key, value, ttl) => {
    return store.set(normalizeKey(key), JSON.stringify(value), ttl ?? defaultTtl);
  };

  const del: CacheInstance["del"] = (key) => {
    return store.del(normalizeKey(key));
  };

  const clear: CacheInstance["clear"] = () => {
    return store.clear();
  };

  const getMultiple: CacheInstance["getMultiple"] = (keys, defaultValue) => {
    return typeof store.getMultiple === "function"
      ? store
          .getMultiple(keys.map((key) => normalizeKey(key)))
          .then((values) => values.map((value) => (value === undefined ? defaultValue : destr(value))))
      : Promise.all(keys.map((key) => get(key, defaultValue)));
  };

  const setMultiple: CacheInstance["setMultiple"] = (values, ttl) => {
    return typeof store.setMultiple === "function"
      ? store.setMultiple(
          Object.entries(values).reduce(
            (acc, [key, value]) => {
              acc[normalizeKey(key)] = JSON.stringify(value);
              return acc;
            },
            {} as Record<string, string>,
          ),
          ttl,
        )
      : Promise.all(Object.entries(values).map(([key, value]) => set(key, value, ttl))).then((results) =>
          results.every(Boolean),
        );
  };

  const delMultiple: CacheInstance["delMultiple"] = (keys) => {
    return typeof store.delMultiple === "function"
      ? store.delMultiple(keys.map((key) => normalizeKey(key)))
      : Promise.all(keys.map(del)).then((results) => results.every(Boolean));
  };

  const has: CacheInstance["has"] = async (key) => {
    return typeof store.has === "function"
      ? store.has(normalizeKey(key))
      : get(key).then((value) => value !== undefined);
  };

  return {
    get,
    set,
    del,
    clear,

    getMultiple,
    setMultiple,
    delMultiple,

    has,
    dispose: async () => {
      if (store.dispose) {
        await store.dispose();
      }
    },
  };
};
