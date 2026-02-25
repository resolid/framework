import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CacheStore } from "./types";
import { Cacher } from "./index";

describe("createCache with fake store", () => {
  let cache: Cacher;
  let fakeStore: CacheStore;

  beforeEach(() => {
    fakeStore = {
      get: vi.fn().mockResolvedValue("value"),
      set: vi.fn().mockResolvedValue(true),
      del: vi.fn().mockResolvedValue(true),
      clear: vi.fn().mockResolvedValue(true),
      getMultiple: vi.fn().mockResolvedValue([1, 2, undefined]),
      setMultiple: vi.fn().mockResolvedValue(true),
      delMultiple: vi.fn().mockResolvedValue(true),
      has: vi.fn().mockResolvedValue(true),
      dispose: vi.fn().mockResolvedValue(undefined),
    };

    cache = new Cacher({ store: fakeStore, defaultTtl: 1000 });
  });

  it("get returns default", async () => {
    const value = await cache.get("key");
    expect(value).toBe("value");
    expect(fakeStore.get).toHaveBeenCalled();
  });

  it("set calls store.set with normalized key", async () => {
    await cache.set("/my/key", 42, 5);
    expect(fakeStore.set).toHaveBeenCalledWith("my:key", "42", 5);
  });

  it("del calls store.del", async () => {
    await cache.del("foo");
    expect(fakeStore.del).toHaveBeenCalledWith("foo");
  });

  it("clear calls store.clear", async () => {
    await cache.clear();
    expect(fakeStore.clear).toHaveBeenCalled();
  });

  it("getMultiple uses store.getMultiple if exists", async () => {
    const values = await cache.getMultiple(["a", "b"]);
    expect(values).toEqual([1, 2, undefined]);
    expect(fakeStore.getMultiple).toHaveBeenCalledWith(["a", "b"]);
  });

  it("getMultiple uses store.getMultiple with default", async () => {
    const values = await cache.getMultiple(["a", "b"], 3);
    expect(values).toEqual([1, 2, 3]);
    expect(fakeStore.getMultiple).toHaveBeenCalledWith(["a", "b"]);
  });

  it("setMultiple uses store.setMultiple if exists", async () => {
    await cache.setMultiple({ a: 1, b: 2 }, 10);
    expect(fakeStore.setMultiple).toHaveBeenCalledWith({ a: "1", b: "2" }, 10);
  });

  it("delMultiple uses store.delMultiple if exists", async () => {
    await cache.delMultiple(["a", "b"]);
    expect(fakeStore.delMultiple).toHaveBeenCalledWith(["a", "b"]);
  });

  it("has uses store.has if exists", async () => {
    const result = await cache.has("key");
    expect(result).toBe(true);
    expect(fakeStore.has).toHaveBeenCalledWith("key");
  });

  it("dispose calls store.dispose if exists", async () => {
    await cache.dispose();
    expect(fakeStore.dispose).toHaveBeenCalled();
  });
});

describe("createCache with partial fake store", () => {
  let cache: Cacher;
  let partialStore: CacheStore;

  beforeEach(() => {
    partialStore = {
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(true),
      del: vi.fn().mockResolvedValue(true),
      clear: vi.fn().mockResolvedValue(true),
    };

    cache = new Cacher({ store: partialStore, defaultTtl: 1000 });
  });

  it("get returns default if undefined", async () => {
    const value = await cache.get("key", "default");
    expect(value).toBe("default");
    expect(partialStore.get).toHaveBeenCalledWith("key");
  });

  it("set calls store.set", async () => {
    await cache.set("foo", 42);
    expect(partialStore.set).toHaveBeenCalledWith("foo", "42", 1000);
  });

  it("del calls store.del", async () => {
    await cache.del("foo");
    expect(partialStore.del).toHaveBeenCalledWith("foo");
  });

  it("clear calls store.clear", async () => {
    await cache.clear();
    expect(partialStore.clear).toHaveBeenCalled();
  });

  it("getMultiple falls back to multiple get calls", async () => {
    const values = await cache.getMultiple(["a", "b"], "def");
    expect(values).toEqual(["def", "def"]);
    expect(partialStore.get).toHaveBeenCalledTimes(2);
  });

  it("setMultiple falls back to multiple set calls", async () => {
    const result = await cache.setMultiple({ a: 1, b: 2 });
    expect(result).toBe(true);
    expect(partialStore.set).toHaveBeenCalledTimes(2);
  });

  it("delMultiple falls back to multiple del calls", async () => {
    const result = await cache.delMultiple(["a", "b"]);
    expect(result).toBe(true);
    expect(partialStore.del).toHaveBeenCalledTimes(2);
  });

  it("has falls back to get call", async () => {
    const result = await cache.has("x");
    expect(result).toBe(false);
    expect(partialStore.get).toHaveBeenCalledWith("x");
  });

  it("dispose calls store.dispose", async () => {
    await cache.dispose();
    expect(partialStore.dispose).toBeUndefined();
  });
});
