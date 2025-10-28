import { beforeEach, describe, expect, it } from "vitest";
import { MemoryCache } from "./memory-cache";

describe("createMemoryCache", () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache(100);
  });

  it("should set and get a value without TTL", async () => {
    const result = await cache.set("foo", "bar");
    expect(result).toBe(true);

    const value = await cache.get("foo");
    expect(value).toBe("bar");
  });

  it("should set and get a value with TTL", async () => {
    const result = await cache.set("ttlKey", "baz", 1); // TTL = 1秒
    expect(result).toBe(true);

    const value = await cache.get("ttlKey");
    expect(value).toBe("baz");
  });

  it("should delete a value", async () => {
    await cache.set("delKey", "value");
    const deleted = await cache.del("delKey");
    expect(deleted).toBe(true);

    const value = await cache.get("delKey");
    expect(value).toBeUndefined();
  });

  it("should clear all values", async () => {
    await cache.set("a", "1");
    await cache.set("b", "2");

    const cleared = await cache.clear();
    expect(cleared).toBe(true);

    expect(await cache.get("a")).toBeUndefined();
    expect(await cache.get("b")).toBeUndefined();
  });

  it("should dispose the cache", async () => {
    await cache.set("x", "y");
    await cache.dispose?.();
    expect(await cache.get("x")).toBeUndefined();
  });

  it("should handle non-existent keys", async () => {
    const value = await cache.get("missing");
    expect(value).toBeUndefined();
  });
});
