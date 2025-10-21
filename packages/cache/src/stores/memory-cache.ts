import QuickLRU from "quick-lru";
import type { CacheStore } from "../types";

export const createMemoryCache = (maxSize: number = 1000): CacheStore => {
  const lru = new QuickLRU<string, string>({ maxSize });

  return {
    get: async (key: string) => {
      return lru.get(key);
    },
    set: async (key, value, ttl) => {
      lru.set(key, value, ttl ? { maxAge: ttl * 1000 } : undefined);

      return true;
    },
    del: async (key) => {
      return lru.delete(key);
    },
    clear: async () => {
      lru.clear();
      return true;
    },
    dispose: async () => {
      lru.clear();
    },
  };
};
