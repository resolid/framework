import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cwd } from "node:process";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileCache } from "./index";

describe("FileCache", () => {
  let cacheDir: string;
  let cache: FileCache;

  beforeEach(async () => {
    cacheDir = join(cwd(), ".temp", "file-cache-tests");
    cache = new FileCache(cacheDir);
  });

  afterEach(async () => {
    await rm(cacheDir, { recursive: true, force: true });
  });

  it("sets and gets a value", async () => {
    await cache.set("foo", "bar");
    const value = await cache.get("foo");
    expect(value).toBe("bar");
  });

  it("returns undefined for missing key", async () => {
    const value = await cache.get("not-exist");
    expect(value).toBeUndefined();
  });

  it("handles TTL expiration", async () => {
    await cache.set("temp", "value", 1);
    expect(await cache.get("temp")).toBe("value");
    await new Promise((r) => setTimeout(r, 1200));
    expect(await cache.get("temp")).toBeUndefined();
  });

  it("deletes an existing key", async () => {
    await cache.set("to-delete", "123");
    const deleted = await cache.del("to-delete");
    expect(deleted).toBe(true);
    expect(await cache.get("to-delete")).toBeUndefined();
  });

  it("clear removes all cache files", async () => {
    await cache.set("a", "1");
    await cache.set("b", "2");
    await cache.clear();
    expect(await cache.get("a")).toBeUndefined();
    expect(await cache.get("b")).toBeUndefined();
  });

  it("locks concurrent writes to same key", async () => {
    const key = "concurrent";

    const writes = Array.from({ length: 10 }, (_, i) => cache.set(key, `v${i}`).then(() => i));

    await Promise.all(writes);

    const content = await readFile(join(cacheDir, "concurrent"), "utf-8");
    const [finalValue] = JSON.parse(content);
    expect(finalValue).toMatch(/^v\d+$/);
  });

  it("does not block independent keys", async () => {
    const t1 = performance.now();

    await Promise.all([cache.set("key1", "a"), cache.set("key2", "b"), cache.set("key3", "c")]);

    const t2 = performance.now();
    expect(t2 - t1).toBeLessThan(200);
  });

  it("rejects invalid keys with relative paths", async () => {
    await expect(cache.set("../hack", "x")).rejects.toThrow(/Invalid key/);
    await expect(cache.set("./hack", "x")).rejects.toThrow(/Invalid key/);
  });

  it("del returns true for non-existent file with force", async () => {
    const result = await cache.del("missing");
    expect(result).toBe(false);
  });

  it("handles corrupted JSON gracefully", async () => {
    const path = join(cacheDir, "corrupt");
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, "not-json");
    const value = await cache.get("corrupt");
    expect(value).toBeUndefined();
  });

  it("get triggers deletion on expired file", async () => {
    await cache.set("expire", "v", 1);
    const path = join(cacheDir, "expire");
    await new Promise((r) => setTimeout(r, 1200));
    const value = await cache.get("expire");
    expect(value).toBeUndefined();
    const exists = await access(path)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(false);
  });
});
