import { describe, expect, it } from "vitest";
import { nullCache } from "./null-cache";

describe("nullCache", () => {
  it("get should return undefined", async () => {
    const value = await nullCache.get("anyKey");
    expect(value).toBeUndefined();
  });

  it("set should return true", async () => {
    const result = await nullCache.set("anyKey", "value");
    expect(result).toBe(true);
  });

  it("del should return true", async () => {
    const result = await nullCache.del("anyKey");
    expect(result).toBe(true);
  });

  it("clear should return true", async () => {
    const result = await nullCache.clear();
    expect(result).toBe(true);
  });

  it("getMultiple should return array of undefined", async () => {
    const keys = ["a", "b", "c"];
    const values = await nullCache.getMultiple(keys);
    expect(values).toEqual([undefined, undefined, undefined]);
  });

  it("setMultiple should return true", async () => {
    const result = await nullCache.setMultiple({ a: "1", b: "2" });
    expect(result).toBe(true);
  });

  it("delMultiple should return true", async () => {
    const result = await nullCache.delMultiple(["a", "b"]);
    expect(result).toBe(true);
  });

  it("has should return false", async () => {
    const exists = await nullCache.has("anyKey");
    expect(exists).toBe(false);
  });

  it("dispose should resolve without error", async () => {
    await expect(nullCache.dispose()).resolves.toBeUndefined();
  });
});
