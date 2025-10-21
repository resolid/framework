import { describe, expect, it } from "vitest";
import { normalizeKey } from "./index";

describe("normalizeKey", () => {
  it("should normalize slashes and colons", () => {
    const key = "/foo\\bar//baz::";
    const normalized = normalizeKey(key);
    expect(normalized).toBe("foo:bar:baz");
  });

  it("should remove query string", () => {
    const key = "foo/bar?param=value";
    const normalized = normalizeKey(key);
    expect(normalized).toBe("foo:bar");
  });

  it("should throw if key becomes empty after normalization", () => {
    const key = "/\\:://";
    expect(() => normalizeKey(key)).toThrow("Cache key cannot be empty after normalization");
  });

  it("should not modify valid key", () => {
    const key = "validKey";
    const normalized = normalizeKey(key);
    expect(normalized).toBe("validKey");
  });
});
