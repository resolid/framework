import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { RedisCache } from "./index";

const REDIS_URL = "redis://localhost:6379";

describe("RedisCache", () => {
  let cache: RedisCache;

  beforeAll(() => {
    cache = new RedisCache(REDIS_URL);
  });

  afterEach(async () => {
    await cache.clear();
  });

  afterAll(async () => {
    await cache.dispose();
  });

  describe("has", () => {
    it("returns false for non-existent key", async () => {
      expect(await cache.has("missing")).toBe(false);
    });

    it("returns true for existing key", async () => {
      await cache.set("k", "v");
      expect(await cache.has("k")).toBe(true);
    });

    it("returns false after key expires", async () => {
      await cache.set("k", "v", 50);
      await new Promise((r) => setTimeout(r, 100));
      expect(await cache.has("k")).toBe(false);
    });
  });

  describe("get", () => {
    it("returns undefined for non-existent key", async () => {
      expect(await cache.get("missing")).toBeUndefined();
    });

    it("returns stored value", async () => {
      await cache.set("k", "hello");
      expect(await cache.get("k")).toBe("hello");
    });

    it("returns undefined after key expires", async () => {
      await cache.set("k", "v", 50);
      await new Promise((r) => setTimeout(r, 100));
      expect(await cache.get("k")).toBeUndefined();
    });
  });

  describe("set", () => {
    it("returns true on success", async () => {
      expect(await cache.set("k", "v")).toBe(true);
    });

    it("overwrites existing value", async () => {
      await cache.set("k", "old");
      await cache.set("k", "new");
      expect(await cache.get("k")).toBe("new");
    });

    it("sets value with TTL", async () => {
      await cache.set("k", "v", 200);
      expect(await cache.get("k")).toBe("v");
      await new Promise((r) => setTimeout(r, 300));
      expect(await cache.get("k")).toBeUndefined();
    });

    it("namespace is applied", async () => {
      await cache.set("k", "v");
      const other = new RedisCache(REDIS_URL, { namespace: "other" });
      expect(await other.get("k")).toBeUndefined();
      await other.dispose();
    });
  });

  describe("getMultiple", () => {
    it("returns empty array for empty input", async () => {
      expect(await cache.getMultiple([])).toEqual([]);
    });

    it("returns values in the same order as keys", async () => {
      await cache.set("a", "1");
      await cache.set("b", "2");
      await cache.set("c", "3");
      expect(await cache.getMultiple(["c", "a", "b"])).toEqual(["3", "1", "2"]);
    });

    it("returns undefined for missing keys", async () => {
      await cache.set("a", "1");
      expect(await cache.getMultiple(["a", "missing", "b"])).toEqual(["1", undefined, undefined]);
    });
  });

  describe("setMultiple", () => {
    it("returns true on success", async () => {
      expect(await cache.setMultiple({ a: "1", b: "2" })).toBe(true);
    });

    it("stores all values", async () => {
      await cache.setMultiple({ a: "1", b: "2", c: "3" });
      expect(await cache.getMultiple(["a", "b", "c"])).toEqual(["1", "2", "3"]);
    });

    it("sets all values with TTL", async () => {
      await cache.setMultiple({ a: "1", b: "2" }, 200);
      expect(await cache.getMultiple(["a", "b"])).toEqual(["1", "2"]);
      await new Promise((r) => setTimeout(r, 300));
      expect(await cache.getMultiple(["a", "b"])).toEqual([undefined, undefined]);
    });

    it("handles empty object", async () => {
      expect(await cache.setMultiple({})).toBe(true);
    });
  });

  describe("del", () => {
    it("returns false for non-existent key", async () => {
      expect(await cache.del("missing")).toBe(false);
    });

    it("deletes existing key and returns true", async () => {
      await cache.set("k", "v");
      expect(await cache.del("k")).toBe(true);
      expect(await cache.get("k")).toBeUndefined();
    });
  });

  describe("delMultiple", () => {
    it("returns true for empty array", async () => {
      expect(await cache.delMultiple([])).toBe(true);
    });

    it("deletes all specified keys", async () => {
      await cache.setMultiple({ a: "1", b: "2", c: "3" });
      await cache.delMultiple(["a", "b"]);
      expect(await cache.getMultiple(["a", "b", "c"])).toEqual([undefined, undefined, "3"]);
    });

    it("ignores non-existent keys", async () => {
      await cache.set("k", "v");
      expect(await cache.delMultiple(["k", "missing"])).toBe(true);
    });
  });

  describe("clear", () => {
    it("returns true", async () => {
      expect(await cache.clear()).toBe(true);
    });

    it("removes all keys in namespace", async () => {
      await cache.setMultiple({ a: "1", b: "2", c: "3" });
      await cache.clear();
      expect(await cache.getMultiple(["a", "b", "c"])).toEqual([undefined, undefined, undefined]);
    });

    it("does not affect other namespaces", async () => {
      const other = new RedisCache(REDIS_URL, { namespace: "other-ns" });
      await other.set("k", "v");
      await cache.setMultiple({ a: "1" });
      await cache.clear();
      expect(await other.get("k")).toBe("v");
      await other.clear();
      await other.dispose();
    });
  });

  describe("connectionTimeout", () => {
    it("throws when timeout is exceeded", async () => {
      const slow = new RedisCache("redis://192.0.2.1:6379", {
        connectionTimeout: 100,
      });

      await expect(slow.has("k")).rejects.toThrow(/timed out/);
    });
  });
});
