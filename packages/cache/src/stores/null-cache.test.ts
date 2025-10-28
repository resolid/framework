import { beforeEach, describe, expect, it } from "vitest";
import { NullCache } from "./null-cache";

describe("nullCache", () => {
  let cache: NullCache;

  beforeEach(() => {
    cache = new NullCache();
  });

  it("get should return undefined", async () => {
    const value = await cache.get("anyKey");
    expect(value).toBeUndefined();
  });

  it("set should return true", async () => {
    const result = await cache.set("anyKey", "value");
    expect(result).toBe(true);
  });

  it("del should return true", async () => {
    const result = await cache.del("anyKey");
    expect(result).toBe(true);
  });

  it("clear should return true", async () => {
    const result = await cache.clear();
    expect(result).toBe(true);
  });

  it("getMultiple should return array of undefined", async () => {
    const keys = ["a", "b", "c"];
    const values = await cache.getMultiple(keys);
    expect(values).toEqual([undefined, undefined, undefined]);
  });

  it("setMultiple should return true", async () => {
    const result = await cache.setMultiple({ a: "1", b: "2" });
    expect(result).toBe(true);
  });

  it("delMultiple should return true", async () => {
    const result = await cache.delMultiple(["a", "b"]);
    expect(result).toBe(true);
  });

  it("has should return false", async () => {
    const exists = await cache.has("anyKey");
    expect(exists).toBe(false);
  });

  it("dispose should resolve without error", async () => {
    await expect(cache.dispose()).resolves.toBeUndefined();
  });
});
