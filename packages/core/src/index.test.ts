import { join } from "node:path";
import { cwd } from "node:process";
import { describe, expect, it, type Mock, vi } from "vitest";
import { createApp, type ExtensionBuilder } from "./index";

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
    const LOG = "LOG";
    const MAIL = "MAIL";

    const createMailExtension: ExtensionBuilder<{ from: string }, { from: string }> = ({ config } = {}) => {
      return {
        name: "mail",
        factory: () => ({ from: config?.from ?? "" }),
      };
    };

    const app = await createApp({
      name: "TestApp",
      extensions: [
        {
          key: LOG,
          extension: {
            name: "log",
            factory: () => ({ log: vi.fn() }),
          },
        },
        {
          key: MAIL,
          extension: createMailExtension({ config: { from: "1" } }),
        },
      ],
    });

    const log = await app.resolve<{ log: Mock }>(LOG);

    expect(log).toHaveProperty("log");
    expect(typeof log.log).toBe("function");

    const mail = await app.resolve<{ from: string }>(MAIL);
    expect(mail.from).toBe("1");
  });

  it("should inject services based on instanceProps mapping", async () => {
    const createLogExtension: ExtensionBuilder<{ log: (msg: string) => void }> = () => ({
      name: "LogExtension",
      factory: () => {
        return {
          log: vi.fn((msg: string) => {
            console.log(`[LOG]: ${msg}`);
          }),
        };
      },
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const app = await createApp<{ logger: { log: (msg: string) => void } }>({
      name: "TestApp",
      debug: true,
      extensions: [
        {
          key: "log",
          extension: createLogExtension(),
        },
      ],
      instanceProps: {
        logger: "log",
      },
    });

    await app.run();

    expect(app.logger).toBeDefined();

    expect(typeof app.logger.log).toBe("function");

    app.logger.log("Hello App!");

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Hello App!"));

    consoleSpy.mockRestore();
  });

  it("should correctly use bindings passed into ExtensionBuilder", async () => {
    const logFactory = vi.fn();

    const createLogExtension: ExtensionBuilder<
      { log: (msg: string) => void },
      Record<string, never>,
      { logKey: string }
    > = ({ bindings }) => ({
      name: "LogExtension",
      factory: async ({ resolver }) => {
        const logService = await resolver.resolve<(msg: string) => void>(bindings.logKey);

        return {
          log: (msg: string) => {
            logFactory(msg);
            logService?.(msg);
          },
        };
      },
    });

    const logService = vi.fn();

    const app = await createApp<{ logger: { log: (msg: string) => void } }>({
      name: "BindingApp",
      extensions: [
        {
          key: "logService",
          extension: {
            name: "LogService",
            factory: () => logService,
          },
        },
        {
          key: "logger",
          extension: createLogExtension({
            bindings: { logKey: "logService" },
          }),
        },
      ],
      instanceProps: {
        logger: "logger",
      },
    });

    await app.run();

    app.logger.log("Hello world!");

    expect(logFactory).toHaveBeenCalledWith("Hello world!");
    expect(logService).toHaveBeenCalledWith("Hello world!");
  });

  it("should call boot functions", async () => {
    const order: string[] = [];

    const app = await createApp({
      name: "TestApp",
      extensions: [
        {
          key: "A",
          extension: {
            name: "a",
            factory: () => ({}),
            boot: () => {
              order.push("A");
            },
          },
        },
        {
          key: "B",
          extension: {
            name: "b",
            factory: () => ({}),
            boot: async () => {
              await new Promise((r) => setTimeout(r, 10));
              order.push("B");
            },
          },
        },
      ],
    });

    await app.run();
    expect(order).toEqual(["A", "B"]);
  });

  it("should only execute boots once even if run() is called multiple times", async () => {
    const bootFn = vi.fn();

    const createBootExtension: ExtensionBuilder<{ name: string }> = () => ({
      name: "BootExtension",
      boot: async () => {
        bootFn();
      },
      factory: () => ({ name: "booted-service" }),
    });

    const app = await createApp({
      name: "BootTestApp",
      extensions: [
        {
          key: "boot",
          extension: createBootExtension(),
        },
      ],
    });

    await app.run();
    await app.run();

    expect(bootFn).toHaveBeenCalledTimes(1);

    const service = await app.resolve<{ name: string }>("boot");
    expect(service.name).toBe("booted-service");
  });

  it("should call dispose functions", async () => {
    const order: string[] = [];

    const A = "A";

    const app = await createApp({
      name: "TestApp",
      extensions: [
        {
          key: A,
          extension: {
            name: "a",
            factory: () => {
              return {
                dispose: () => {
                  order.push("dispose");
                },
              };
            },
          },
        },
      ],
    });

    await app.run();

    await app.resolve<{ log: Mock }>(A);

    await app.dispose();

    expect(order).toEqual(["dispose"]);
  });

  it("should throw when boot fails", async () => {
    const app = await createApp({
      name: "TestApp",
      debug: true,
      extensions: [
        {
          key: "FAIL",
          extension: {
            name: "fail",
            factory: () => ({}),
            boot: () => {
              throw new Error("Boot failed");
            },
          },
        },
      ],
    });

    await expect(app.run()).rejects.toThrow("Boot failed");
  });

  describe("rootPath and runtimePath should handle simple paths", async () => {
    const app = await createApp({ name: "test-app", extensions: [] });

    const rootBase = cwd();
    const runtimeBase = join(rootBase, "runtime");

    testPathMethod(app.rootPath, rootBase);
    testPathMethod(app.runtimePath, runtimeBase);
  });
});
