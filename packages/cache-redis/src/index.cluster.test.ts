import { describe, expect, it, beforeAll, afterAll, afterEach } from "vitest";
import { RedisCache } from "./index";

describe("RedisCache Cluster", () => {
  let cache: RedisCache;

  beforeAll(async () => {
    cache = new RedisCache({
      rootNodes: [
        {
          url: "redis://localhost:7001",
        },
        {
          url: "redis://localhost:7002",
        },
        {
          url: "redis://localhost:7003",
        },
      ],
      useReplicas: true,
    });
  });

  afterEach(async () => {
    //await cache.clear();
  });

  afterAll(async () => {
    await cache.dispose();
  });

  describe("getMultiple", () => {
    it("works in cluster mode", async () => {
      await cache.set("a1", "1");
      await cache.set("b1", "2");

      expect(await cache.getMultiple(["a1", "b1"])).toEqual(["1", "2"]);
    });
  });

  describe("setMultiple", () => {
    it("works in cluster mode", async () => {
      await cache.setMultiple({
        a2: "1",
        b2: "2",
      });

      expect(await cache.getMultiple(["a2", "b2"])).toEqual(["1", "2"]);
    });

    it("supports ttl", async () => {
      await cache.setMultiple(
        {
          a3: "1",
          b3: "2",
        },
        100,
      );

      expect(await cache.getMultiple(["a3", "b3"])).toEqual(["1", "2"]);

      await new Promise((r) => setTimeout(r, 200));

      expect(await cache.getMultiple(["a3", "b3"])).toEqual([undefined, undefined]);
    });
  });

  describe("delMultiple", () => {
    it("works in cluster mode", async () => {
      await cache.setMultiple({
        a4: "1",
        b4: "2",
      });

      expect(await cache.getMultiple(["a4", "b4"])).toEqual(["1", "2"]);

      await cache.delMultiple(["a4", "b4"]);

      expect(await cache.getMultiple(["a4", "b4"])).toEqual([undefined, undefined]);
    });
  });
});
