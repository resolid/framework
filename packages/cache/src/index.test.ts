import { beforeEach, describe, expect, it, vi } from "vitest";
import { Cacher } from "./index";
import { MemoryCache } from "./stores/memory-cache";

describe("Cacher", () => {
  let cache: Cacher;

  beforeEach(() => {
    cache = new Cacher({ store: new MemoryCache(), defaultTtl: 1 });
  });

  describe("get", () => {
    it("returns undefined on miss", async () => {
      expect(await cache.get("key")).toBeUndefined();
    });

    it("returns default value on miss", async () => {
      expect(await cache.get("key", "default")).toBe("default");
    });

    it("returns cached value on hit", async () => {
      await cache.set("key", "value");
      expect(await cache.get("key")).toBe("value");
    });
  });

  describe("set", () => {
    it("stores and retrieves value", async () => {
      await cache.set("key", 42);
      expect(await cache.get("key")).toBe(42);
    });

    it("normalizes key", async () => {
      await cache.set("/my/key", 42);
      expect(await cache.get("my:key")).toBe(42);
    });

    it("uses defaultTtl when ttl not provided", async () => {
      vi.useFakeTimers();
      await cache.set("key", "value");
      vi.advanceTimersByTime(1001);
      expect(await cache.get("key")).toBeUndefined();
      vi.useRealTimers();
    });

    it("uses provided ttl over defaultTtl", async () => {
      vi.useFakeTimers();
      await cache.set("key", "value", 0.5);
      vi.advanceTimersByTime(501);
      expect(await cache.get("key")).toBeUndefined();
      vi.useRealTimers();
    });
  });

  describe("del", () => {
    it("removes a key", async () => {
      await cache.set("key", "value");
      await cache.del("key");
      expect(await cache.get("key")).toBeUndefined();
    });
  });

  describe("clear", () => {
    it("removes all keys", async () => {
      await cache.set("a", 1);
      await cache.set("b", 2);
      await cache.clear();
      expect(await cache.get("a")).toBeUndefined();
      expect(await cache.get("b")).toBeUndefined();
    });
  });

  describe("has", () => {
    it("returns true if key exists", async () => {
      await cache.set("key", "value");
      expect(await cache.has("key")).toBe(true);
    });

    it("returns false if key does not exist", async () => {
      expect(await cache.has("missing")).toBe(false);
    });
  });

  describe("getMultiple", () => {
    it("returns values for existing keys", async () => {
      await cache.set("a", 1);
      await cache.set("b", 2);
      expect(await cache.getMultiple(["a", "b"])).toEqual([1, 2]);
    });

    it("returns undefined for missing keys", async () => {
      await cache.set("a", 1);
      expect(await cache.getMultiple(["a", "missing"])).toEqual([1, undefined]);
    });

    it("returns default value for missing keys", async () => {
      await cache.set("a", 1);
      expect(await cache.getMultiple(["a", "missing"], 0)).toEqual([1, 0]);
    });
  });

  describe("setMultiple", () => {
    it("stores multiple values", async () => {
      await cache.setMultiple({ a: 1, b: 2 });
      expect(await cache.getMultiple(["a", "b"])).toEqual([1, 2]);
    });

    it("uses provided ttl", async () => {
      vi.useFakeTimers();
      await cache.setMultiple({ a: 1, b: 2 }, 0.5);
      vi.advanceTimersByTime(501);
      expect(await cache.getMultiple(["a", "b"])).toEqual([undefined, undefined]);
      vi.useRealTimers();
    });
  });

  describe("delMultiple", () => {
    it("removes multiple keys", async () => {
      await cache.setMultiple({ a: 1, b: 2 });
      await cache.delMultiple(["a", "b"]);
      expect(await cache.getMultiple(["a", "b"])).toEqual([undefined, undefined]);
    });
  });

  describe("getOrSet", () => {
    it("returns cached value on hit", async () => {
      await cache.set("key", "cached");
      const factory = vi.fn();
      expect(await cache.getOrSet("key", factory)).toBe("cached");
      expect(factory).not.toHaveBeenCalled();
    });

    it("calls factory and stores value on miss", async () => {
      const value = await cache.getOrSet("key", () => 42, 500);
      expect(value).toBe(42);
      expect(await cache.get("key")).toBe(42);
    });

    it("uses ttl set by factory ctx", async () => {
      vi.useFakeTimers();
      await cache.getOrSet(
        "key",
        (ctx) => {
          ctx.setTtl(0.5);
          return 42;
        },
        50,
      );
      vi.advanceTimersByTime(501);
      expect(await cache.get("key")).toBeUndefined();
      vi.useRealTimers();
    });

    it("allows factory ctx to override ttl to undefined", async () => {
      vi.useFakeTimers();
      await cache.getOrSet(
        "key",
        (ctx) => {
          ctx.setTtl(undefined);
          return 42;
        },
        5000,
      );
      vi.advanceTimersByTime(10000);
      expect(await cache.get("key")).toBe(42);
      vi.useRealTimers();
    });

    it("dedupes concurrent calls for the same key", async () => {
      const factory = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return "value";
      });

      const results = await Promise.all([
        cache.getOrSet("key", factory),
        cache.getOrSet("key", factory),
        cache.getOrSet("key", factory),
      ]);

      expect(results).toEqual(["value", "value", "value"]);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("cleans up inflight entry after factory rejects", async () => {
      const factory = vi.fn().mockRejectedValueOnce(new Error("fail")).mockResolvedValueOnce("ok");

      await expect(cache.getOrSet("key", factory)).rejects.toThrow("fail");
      expect(await cache.getOrSet("key", factory)).toBe("ok");
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  describe("dispose", () => {
    it("does not throw", async () => {
      await expect(cache.dispose()).resolves.toBeUndefined();
    });
  });
});
