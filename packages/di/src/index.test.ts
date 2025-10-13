import { describe, expect, it, vi } from "vitest";
import { createContainer } from "./index";

describe("Container", () => {
  describe("Basic binding functionality", () => {
    it("should bind and resolve values", async () => {
      const name = Symbol("test");
      const value = { foo: "bar" };

      const container = createContainer([
        {
          name,
          value,
        },
      ]);

      const resolved = await container.resolve(name);

      expect(resolved).toBe(value);
    });

    it("should bind and resolve functions", async () => {
      const name = Symbol("testFn");
      const callable = () => "hello";

      const container = createContainer([
        {
          name,
          callable,
        },
      ]);

      const resolved = await container.resolve<typeof callable>(name);

      expect(resolved).toBe(callable);
      expect(resolved()).toBe("hello");
    });

    it("should bind and resolve factory functions", async () => {
      const name = Symbol("testFactory");

      const container = createContainer([
        {
          name,
          factory: () => {
            return { created: Date.now() };
          },
        },
      ]);

      const resolved = await container.resolve<{ created: number }>(name);
      expect(resolved).toHaveProperty("created");
      expect(typeof resolved.created).toBe("number");
    });

    it("should throw error when resolving non-existent binding", async () => {
      const name = Symbol("nonExistent");

      const container = createContainer([]);

      await expect(container.resolve(name)).rejects.toThrow("No binding found for");
    });
  });

  describe("Scope management", () => {
    it("should return same instance for singleton scope", async () => {
      const name = Symbol("singleton");
      let callCount = 0;

      const container = createContainer([
        {
          name,
          factory: () => {
            callCount++;
            return { id: callCount };
          },
        },
      ]);

      const first = await container.resolve(name);
      const second = await container.resolve(name);

      expect(callCount).toBe(1);
      expect(first).toBe(second);
    });

    it("should return different instances for transient scope", async () => {
      const name = Symbol("transient");
      let callCount = 0;

      const container = createContainer([
        {
          name,
          factory: () => {
            callCount++;
            return { id: callCount };
          },
          scope: "transient",
        },
      ]);

      const first = await container.resolve<{ id: number }>(name);
      const second = await container.resolve<{ id: number }>(name);

      expect(callCount).toBe(2);
      expect(first).not.toBe(second);
      expect(first.id).toBe(1);
      expect(second.id).toBe(2);
    });
  });

  describe("Dependency resolution", () => {
    it("should resolve nested dependencies", async () => {
      const DATABASE = Symbol("database");
      const SERVICE = Symbol("service");

      const container = createContainer([
        { name: DATABASE, value: { query: () => "data" } },
        {
          name: SERVICE,
          factory: async ({ resolver }) => {
            const db = await resolver.resolve(DATABASE);
            return { db, execute: () => "executed" };
          },
        },
      ]);

      const service = await container.resolve<{ db: { query: () => string }; execute: () => string }>(SERVICE);
      expect(service.db).toHaveProperty("query");
      expect(service.execute()).toBe("executed");
    });

    it("should detect circular dependencies", async () => {
      const A = Symbol("A");
      const B = Symbol("B");

      const container = createContainer([
        {
          name: A,
          factory: async ({ resolver }) => {
            await resolver.resolve(B);
            return "A";
          },
        },
        {
          name: B,
          factory: async ({ resolver }) => {
            await resolver.resolve(A);
            return "B";
          },
        },
      ]);

      await expect(container.resolve(A)).rejects.toThrow("Circular dependency detected");
    });

    it("should detect self-referencing circular dependency", async () => {
      const name = Symbol("self");

      const container = createContainer([
        {
          name,
          factory: async ({ resolver }) => {
            await resolver.resolve(name);
            return "self";
          },
        },
      ]);

      await expect(container.resolve(name)).rejects.toThrow("Circular dependency detected");
    });
  });

  describe("Lazy resolution", () => {
    it("should lazily resolve dependencies", async () => {
      const LAZY = Symbol("lazy");
      const CONSUMER = Symbol("consumer");

      const container = createContainer([
        { name: LAZY, value: { data: "lazy data" } },
        {
          name: CONSUMER,
          factory: ({ resolver }) => {
            const lazy = resolver.lazyResolve<{ data: string }>(LAZY);
            return {
              getLazyData: () => lazy.value.data,
            };
          },
        },
      ]);

      const consumer = await container.resolve<{ getLazyData: () => string }>(CONSUMER);

      expect(consumer.getLazyData()).toBe("lazy data");
    });

    it("should throw error when accessing lazy value synchronously in factory", async () => {
      const LAZY = Symbol("lazy");
      const CONSUMER = Symbol("consumer");

      const container = createContainer([
        { name: LAZY, value: { data: "lazy data" } },
        {
          name: CONSUMER,
          factory: ({ resolver }) => {
            const lazy = resolver.lazyResolve<{ data: string }>(LAZY);

            expect(() => lazy.value).toThrow("Lazy binding is not yet resolved");

            return { lazy };
          },
        },
      ]);

      await container.resolve(CONSUMER);
    });

    it("should throw clear error when lazy resolution fails", async () => {
      const NON_EXISTENT = Symbol("nonExistent");
      const CONSUMER = Symbol("consumer");

      const container = createContainer([
        {
          name: CONSUMER,
          factory: ({ resolver }) => {
            const lazy = resolver.lazyResolve(NON_EXISTENT);
            return { lazy };
          },
        },
      ]);

      await expect(container.resolve(CONSUMER)).rejects.toThrow("Failed to resolve lazy binding");
    });

    it("should resolve correctly cycle of 3 bindings", async () => {
      const A = Symbol("A");
      const B = Symbol("B");
      const C = Symbol("C");

      const container = createContainer([
        {
          name: A,
          factory: async ({ resolver }) => {
            const b = await resolver.resolve(B);

            return { value: "A", child: b };
          },
        },
        {
          name: B,
          factory: async ({ resolver }) => {
            const c = await resolver.resolve(C);

            return { value: "B", child: c };
          },
        },
        {
          name: C,
          factory: async ({ resolver }) => {
            const a = resolver.lazyResolve(A);

            return { value: "C", child: a };
          },
        },
      ]);

      type CyclicValue = {
        value: { value: string };
        child: CyclicValue;
      };

      const a = await container.resolve<CyclicValue>(A);

      expect(a.value).toBe("A");
      expect(a.child.value).toBe("B");
      expect(a.child.child.value).toBe("C");
      expect(a.child.child.child.value.value).toBe("A");
    });
  });

  describe("Configuration passing", () => {
    it("should pass configuration to factory function", async () => {
      const CONFIGURABLE = Symbol("configurable");
      const config = { host: "localhost", port: 3000 };

      const container = createContainer([
        {
          name: CONFIGURABLE,
          factory: ({ config }) => {
            return { settings: config };
          },
          config,
        },
      ]);

      const resolved = await container.resolve<{ settings: typeof config }>(CONFIGURABLE);
      expect(resolved.settings).toEqual(config);
    });
  });

  describe("Resource cleanup", () => {
    it("should dispose singleton instances on dispose", async () => {
      const DISPOSABLE = Symbol("disposable");
      const disposeFn = vi.fn();

      const instance: {
        dispose: () => Promise<void> | void;
      } = {
        dispose: disposeFn,
      };

      const container = createContainer([{ name: DISPOSABLE, value: instance }]);

      await container.resolve(DISPOSABLE);

      await container.dispose();

      expect(disposeFn).toHaveBeenCalledTimes(1);
    });

    it("should collect all errors when disposing multiple resources", async () => {
      const DISPOSABLE1 = Symbol("disposable1");
      const DISPOSABLE2 = Symbol("disposable2");
      const DISPOSABLE3 = Symbol("disposable3");

      const instance1: {
        dispose: () => Promise<void> | void;
      } = {
        dispose: vi.fn().mockRejectedValue(new Error("Error 1")),
      };
      const instance2: {
        dispose: () => Promise<void> | void;
      } = {
        dispose: vi.fn().mockRejectedValue(new Error("Error 2")),
      };
      const instance3: {
        dispose: () => Promise<void> | void;
      } = {
        dispose: vi.fn(),
      };

      const container = createContainer([
        { name: DISPOSABLE1, value: instance1 },
        { name: DISPOSABLE2, value: instance2 },
        { name: DISPOSABLE3, value: instance3 },
      ]);

      await container.resolve(DISPOSABLE1);
      await container.resolve(DISPOSABLE2);
      await container.resolve(DISPOSABLE3);

      await expect(container.dispose()).rejects.toThrow("Failed to dispose 2 binding(s)");

      expect(instance1.dispose).toHaveBeenCalled();
      expect(instance2.dispose).toHaveBeenCalled();
      expect(instance3.dispose).toHaveBeenCalled();
    });
  });

  describe("Async factory functions", () => {
    it("should support async factory functions", async () => {
      const ASYNC_FACTORY = Symbol("asyncFactory");

      const container = createContainer([
        {
          name: ASYNC_FACTORY,
          factory: async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return { async: true };
          },
        },
      ]);

      const resolved = await container.resolve<{ async: boolean }>(ASYNC_FACTORY);
      expect(resolved.async).toBe(true);
    });

    it("should correctly resolve async dependency chains", async () => {
      const A = Symbol("A");
      const B = Symbol("B");
      const C = Symbol("C");

      const container = createContainer([
        {
          name: A,
          factory: async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return "A";
          },
        },
        {
          name: B,
          factory: async ({ resolver }) => {
            const a = await resolver.resolve(A);
            await new Promise((resolve) => setTimeout(resolve, 10));
            return `${a}B`;
          },
        },
        {
          name: C,
          factory: async ({ resolver }) => {
            const b = await resolver.resolve(B);
            return `${b}C`;
          },
        },
      ]);

      const result = await container.resolve<string>(C);
      expect(result).toBe("ABC");
    });
  });

  describe("Edge cases", () => {
    it("should handle undefined values", async () => {
      const UNDEFINED_VALUE = Symbol("undefined");

      const container = createContainer([{ name: UNDEFINED_VALUE, value: undefined }]);

      const resolved = await container.resolve(UNDEFINED_VALUE);
      expect(resolved).toBeUndefined();
    });

    it("should handle null values", async () => {
      const NULL_VALUE = Symbol("null");

      const container = createContainer([{ name: NULL_VALUE, value: null }]);

      const resolved = await container.resolve(NULL_VALUE);
      expect(resolved).toBeNull();
    });

    it("should handle complex objects", async () => {
      const COMPLEX = Symbol("complex");
      // noinspection JSUnusedGlobalSymbols
      const complexValue = {
        nested: {
          deep: {
            value: [1, 2, 3],
            fn: () => "test",
          },
        },
        map: new Map([["key", "value"]]),
        set: new Set([1, 2, 3]),
      };

      const container = createContainer([{ name: COMPLEX, value: complexValue }]);

      const resolved = await container.resolve<typeof complexValue>(COMPLEX);

      expect(resolved).toBe(complexValue);
      expect(resolved.nested.deep.value).toEqual([1, 2, 3]);
      expect(resolved.map.get("key")).toBe("value");
    });
  });
});
