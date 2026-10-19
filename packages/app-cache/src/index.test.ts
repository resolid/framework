import { type AppContext, createApp } from "@resolid/app";
import { describe, expect, it, vi } from "vitest";
import {
  CacheService,
  type CacheExtensionConfig,
  type CacheStore,
  createCacheExtension,
  MemoryCache,
  NullCache,
} from "./index";

async function createTestApp(config: CacheExtensionConfig = {}) {
  return createApp({
    name: "TestApp",
    extensions: [createCacheExtension(config)],
    expose: { cache: CacheService },
  });
}

describe("CacheService", () => {
  it("reads and writes through the default cache", async () => {
    const app = await createTestApp({ store: new MemoryCache() });

    await app.$.cache.set("key", { value: 1 });

    expect(await app.$.cache.get("key")).toEqual({ value: 1 });

    await app.dispose();
  });

  it("reads and writes through named caches", async () => {
    const app = await createTestApp({
      stores: {
        memory: new MemoryCache(),
        none: new NullCache(),
      },
    });

    await app.$.cache.use("memory").set("key", "value");

    expect(await app.$.cache.use("memory").get("key")).toBe("value");
    expect(await app.$.cache.use("none").get("key")).toBeUndefined();

    await app.dispose();
  });

  it("delegates every operation to the default cache", async () => {
    const app = await createTestApp({ store: new MemoryCache() });
    const { cache } = app.$;

    await cache.set("a", 1);
    await cache.setMultiple({ b: 2, c: 3 });

    expect(await cache.get("a")).toBe(1);
    expect(await cache.getMultiple(["a", "b"])).toEqual([1, 2]);
    expect(await cache.has("a")).toBe(true);

    expect(await cache.del("a")).toBe(true);
    expect(await cache.delMultiple(["b", "c"])).toBe(true);

    await cache.set("d", 4);
    expect(await cache.getOrSet("d", () => 5)).toBe(4);
    expect(await cache.getOrSet("e", () => 5)).toBe(5);

    expect(await cache.clear()).toBe(true);

    await app.dispose();
  });

  it("throws for an unknown cache name", async () => {
    const app = await createTestApp({ store: new MemoryCache() });

    expect(() => app.$.cache.use("unknown")).toThrow('Cache with name "unknown" does not exist.');

    await app.dispose();
  });

  it("disposes every cache and forgets them", async () => {
    const first = new MemoryCache();
    const second = new MemoryCache();
    const firstDispose = vi.spyOn(first, "dispose");
    const secondDispose = vi.spyOn(second, "dispose");

    const app = await createTestApp({ stores: { first, second } });

    await app.dispose();

    expect(firstDispose).toHaveBeenCalledTimes(1);
    expect(secondDispose).toHaveBeenCalledTimes(1);
    expect(() => app.$.cache.use("first")).toThrow("does not exist");
  });

  it("clears its caches even when a store fails to dispose", async () => {
    const store: CacheStore = {
      get: async () => undefined,
      set: async () => true,
      del: async () => true,
      clear: async () => true,
      dispose: async () => {
        throw new Error("boom");
      },
    };

    const app = await createTestApp({ store });

    await expect(app.dispose()).rejects.toThrow("Failed to dispose 1 provider(s)");
    expect(() => app.$.cache.use("main")).toThrow("does not exist");
  });
});

describe("createCacheExtension", () => {
  it("defaults to a NullCache when no store is configured", async () => {
    const app = await createTestApp();

    await app.$.cache.set("key", "value");

    expect(await app.$.cache.get("key")).toBeUndefined();

    await app.dispose();
  });

  it("defaults to the first store when defaultStore is omitted", async () => {
    const app = await createTestApp({
      stores: { primary: new MemoryCache(), secondary: new MemoryCache() },
    });

    await app.$.cache.set("key", "value");

    expect(await app.$.cache.use("primary").get("key")).toBe("value");
    expect(await app.$.cache.use("secondary").get("key")).toBeUndefined();

    await app.dispose();
  });

  it("honours an explicit defaultStore", async () => {
    const app = await createTestApp({
      stores: { primary: new MemoryCache(), secondary: new MemoryCache() },
      defaultStore: "secondary",
    });

    await app.$.cache.set("key", "value");

    expect(await app.$.cache.use("secondary").get("key")).toBe("value");
    expect(await app.$.cache.use("primary").get("key")).toBeUndefined();

    await app.dispose();
  });

  it("rejects a defaultStore that does not exist", () => {
    expect(() =>
      createCacheExtension({ stores: { primary: new MemoryCache() }, defaultStore: "missing" }),
    ).toThrow('Default cache "missing" does not exist');
  });

  it("rejects an empty store map", () => {
    expect(() => createCacheExtension({ stores: {} })).toThrow("requires at least one store");
  });

  it("calls store factories with the app context", async () => {
    const factory = vi.fn((_ctx: AppContext) => new MemoryCache());

    const app = await createTestApp({ stores: { main: factory } });

    expect(factory).toHaveBeenCalledTimes(1);

    const [context] = factory.mock.calls[0]!;
    expect(context.name).toBe("TestApp");

    await app.dispose();
  });
});
