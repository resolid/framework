import QuickLRU from "quick-lru";
import type { CacheStore } from "../types";

export class MemoryCache implements CacheStore {
  private readonly lru: QuickLRU<string, string>;

  constructor(maxSize: number = 1000) {
    this.lru = new QuickLRU({ maxSize });
  }

  async get(key: string): Promise<string | undefined> {
    return this.lru.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    this.lru.set(key, value, ttl ? { maxAge: ttl * 1000 } : undefined);
    return true;
  }

  async del(key: string): Promise<boolean> {
    return this.lru.delete(key);
  }

  async clear(): Promise<boolean> {
    this.lru.clear();
    return true;
  }

  async dispose(): Promise<void> {
    this.lru.clear();
  }
}
