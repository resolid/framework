import { join } from "node:path";
import { cwd } from "node:process";
import { describe, expect, it, vi } from "vitest";
import { createApp, type Extension, type ExtensionCreator, type Token } from "./index";

const testPathMethod = (methodFn: (...paths: string[]) => string, basePath: string) => {
  it("should return base path when called with no arguments", () => {
    expect(methodFn()).toBe(basePath);
  });

  it("should handle single segment", () => {
    expect(methodFn("config")).toBe(join(basePath, "config"));
    expect(methodFn("config\\log")).toBe(join(basePath, "config", "log"));
    expect(methodFn("config/log")).toBe(join(basePath, "config", "log"));
  });

  it("should handle multiple segments", () => {
    expect(methodFn("a", "b", "c")).toBe(join(basePath, "a", "b", "c"));
    expect(methodFn("x\\y", "z")).toBe(join(basePath, "x", "y", "z"));
    expect(methodFn("nested\\dir/file.txt")).toBe(join(basePath, "nested", "dir", "file.txt"));
  });

  it("should handle empty string segments", () => {
    expect(methodFn("")).toBe(join(basePath, ""));
  });
};

describe("createApp", () => {
  it("should register extensions and resolve them", async () => {
    const LOG = Symbol("LOG") as Token<{ log: () => void }>;
    const MAIL = Symbol("MAIL");

    const createMailExtension = (config: { from?: string } = {}): ExtensionCreator => {
      return () => ({
        name: "mail-extension",
        providers: [
          { token: MAIL, factory: async () => ({ from: config?.from ?? "" }), async: true },
        ],
      });
    };

    const createLogExtension = (): Extension => {
      return {
        name: "log-extension",
        providers: [{ token: LOG, factory: () => ({ log: vi.fn() }) }],
      };
    };

    const app = await createApp({
      name: "TestApp",
      extensions: [createLogExtension(), createMailExtension({ from: "1" })],
      expose: {
        logger: {
          token: LOG,
        },
      },
    });

    const log = app.$.logger;

    expect(log).toHaveProperty("log");
    expect(typeof log.log).toBe("function");

    const mail = await app.getAsync<{ from: string }>(MAIL);
    expect(mail.from).toBe("1");
  });

  it("should call boot functions", async () => {
    const order: string[] = [];

    const app = await createApp({
      name: "TestApp",
      extensions: [
        {
          name: "a",
          boot: () => {
            order.push("A");
          },
        },
        {
          name: "b",
          boot: async () => {
            await new Promise((r) => setTimeout(r, 10));
            order.push("B");
          },
        },
      ],
    });

    await app.run();

    expect(order).toEqual(["A", "B"]);
  });

  it("should only execute boots once even if run() is called multiple times", async () => {
    const BOOT = Symbol("BOOT");
    const bootFn = vi.fn();

    const app = await createApp({
      name: "BootTestApp",
      extensions: [
        {
          name: "BootExtension",
          boot: async () => {
            bootFn();
          },
          providers: [
            {
              token: BOOT,
              factory() {
                return { name: "booted-service" };
              },
            },
          ],
        },
      ],
    });

    await app.run();
    await app.run();

    expect(bootFn).toHaveBeenCalledTimes(1);

    const service = app.get<{ name: "booted-service" }>(BOOT);

    expect(service.name).toBe("booted-service");
  });

  it("should call dispose functions", async () => {
    const order: string[] = [];

    const A = Symbol("A");

    const app = await createApp({
      name: "TestApp",
      extensions: [
        {
          name: "a",
          providers: [
            {
              token: A,
              factory: async () => {
                return {
                  dispose: () => {
                    order.push("dispose");
                  },
                };
              },
            },
          ],
        },
      ],
      expose: {
        a: {
          token: A,
          async: true,
        },
      },
    });

    await app.run();

    await app.dispose();

    expect(order).toEqual(["dispose"]);
  });

  it("should throw when boot fails", async () => {
    const app = await createApp({
      name: "TestApp",
      debug: true,
      extensions: [
        {
          name: "fail",
          boot: () => {
            throw new Error("Boot failed");
          },
        },
      ],
    });

    await expect(app.run()).rejects.toThrow("Boot failed");
  });

  describe("rootPath and runtimePath should handle simple paths", async () => {
    const app = await createApp({ name: "test-app" });

    const rootBase = cwd();
    const runtimeBase = join(rootBase, "runtime");

    testPathMethod((...paths) => app.rootPath(...paths), rootBase);
    testPathMethod((...paths) => app.runtimePath(...paths), runtimeBase);
  });
});
