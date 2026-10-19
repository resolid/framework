import nodePath from "node:path";
import { cwd, env } from "node:process";
import { describe, expect, it, vi } from "vitest";
import {
  createApp,
  type ExtensionCreator,
  loadProviders,
  type PathResolver,
  type Token,
} from "./index";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimezone = async (timezone: string | undefined, run: () => Promise<void>) => {
  const previous = env.TZ;

  if (timezone === undefined) {
    delete env.TZ;
  } else {
    env.TZ = timezone;
  }

  try {
    await run();
  } finally {
    if (previous === undefined) {
      delete env.TZ;
    } else {
      env.TZ = previous;
    }
  }
};

// Capitalized but not constructible, so it must not be registered as a provider.
const Handler = () => "not a class";
const lowerCaseHandler = () => "not a class";

const testPathMethod = (methodFn: PathResolver, basePath: string) => {
  it("should return base path when called with no arguments", () => {
    expect(methodFn()).toBe(basePath);
  });

  it("should handle single segment", () => {
    expect(methodFn("config")).toBe(nodePath.join(basePath, "config"));
    expect(methodFn("config\\log")).toBe(nodePath.join(basePath, "config", "log"));
    expect(methodFn("config/log")).toBe(nodePath.join(basePath, "config", "log"));
  });

  it("should handle multiple segments", () => {
    expect(methodFn("a", "b", "c")).toBe(nodePath.join(basePath, "a", "b", "c"));
    expect(methodFn("x\\y", "z")).toBe(nodePath.join(basePath, "x", "y", "z"));
    expect(methodFn("nested\\dir/file.txt")).toBe(
      nodePath.join(basePath, "nested", "dir", "file.txt"),
    );
  });

  it("should handle empty string segments", () => {
    expect(methodFn("")).toBe(nodePath.join(basePath, ""));
  });
};

describe("createApp", () => {
  it("should register extensions and resolve them", async () => {
    const LOG = Symbol("LOG") as Token<{ log: () => void }>;
    const MAIL = Symbol("MAIL");

    const createMailExtension =
      (config: { from?: string } = {}): ExtensionCreator =>
      () => ({
        name: "mail-extension",
        providers: [{ token: MAIL, factory: () => ({ from: config.from ?? "" }) }],
      });

    const app = await createApp({
      name: "TestApp",
      extensions: [createMailExtension({ from: "1" })],
      providers: [{ token: LOG, factory: () => ({ log: vi.fn() }) }],
      expose: {
        logger: LOG,
      },
    });

    const log = app.$.logger;

    expect(log).toHaveProperty("log");
    expect(typeof log.log).toBe("function");

    const mail = app.get<{ from: string }>(MAIL);
    expect(mail.from).toBe("1");
  });

  it("should call boot functions", async () => {
    const order: string[] = [];

    const app = await createApp({
      name: "TestApp",
      extensions: [
        {
          name: "a",
          bootstrap: () => {
            order.push("A");
          },
        },
        {
          name: "b",
          bootstrap: async () => {
            await new Promise((r) => setTimeout(r, 10));
            order.push("B");
          },
        },
      ],
    });

    await app.run();

    expect(order).toEqual(["A", "B"]);
  });

  it("should run boot functions in extension order, even when an earlier one is slow", async () => {
    const order: string[] = [];

    const app = await createApp({
      name: "TestApp",
      extensions: [
        {
          name: "a",
          bootstrap: async () => {
            await delay(20);
            order.push("A");
          },
        },
        {
          name: "b",
          bootstrap: async () => {
            order.push("B");
          },
        },
        {
          name: "c",
          bootstrap: () => {
            order.push("C");
          },
        },
      ],
    });

    await app.run();

    expect(order).toEqual(["A", "B", "C"]);
  });

  it("should share a single start between concurrent run() calls", async () => {
    const boot = vi.fn(async () => {
      await delay(10);
    });

    const app = await createApp({
      name: "TestApp",
      extensions: [{ name: "a", bootstrap: boot }],
    });

    await Promise.all([app.run(), app.run(), app.run()]);

    expect(boot).toHaveBeenCalledTimes(1);
  });

  it("should not re-run boot functions after a failed start", async () => {
    const boot = vi.fn(() => {
      throw new Error("boot failed");
    });

    const app = await createApp({
      name: "TestApp",
      extensions: [{ name: "a", bootstrap: boot }],
    });

    await expect(app.run()).rejects.toThrow("boot failed");
    await expect(app.run()).rejects.toThrow("boot failed");

    expect(boot).toHaveBeenCalledTimes(1);
  });

  it("should wait for an in-flight start before disposing", async () => {
    const order: string[] = [];
    const RESOURCE = Symbol("RESOURCE");

    const app = await createApp({
      name: "TestApp",
      providers: [
        {
          token: RESOURCE,
          factory: () => ({
            dispose: () => {
              order.push("dispose");
            },
          }),
        },
      ],
      extensions: [
        {
          name: "a",
          bootstrap: async () => {
            await delay(10);
            order.push("bootstrap");
          },
        },
      ],
      expose: { resource: RESOURCE },
    });

    await Promise.all([app.run(), app.dispose()]);

    expect(order).toEqual(["bootstrap", "dispose"]);
  });

  it("should keep disposing when the start failed", async () => {
    const RESOURCE = Symbol("RESOURCE");
    const dispose = vi.fn();

    const app = await createApp({
      name: "TestApp",
      providers: [{ token: RESOURCE, factory: () => ({ dispose }) }],
      extensions: [
        {
          name: "a",
          bootstrap: () => {
            throw new Error("boot failed");
          },
        },
      ],
      expose: { resource: RESOURCE },
    });

    await expect(app.run()).rejects.toThrow("boot failed");
    await expect(app.dispose()).resolves.toBeUndefined();

    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("should dispose providers once when dispose is called concurrently", async () => {
    const RESOURCE = Symbol("RESOURCE");
    const dispose = vi.fn();

    const app = await createApp({
      name: "TestApp",
      providers: [{ token: RESOURCE, factory: () => ({ dispose }) }],
      expose: { resource: RESOURCE },
    });

    await Promise.all([app.dispose(), app.dispose(), app.dispose()]);

    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("should refuse to run after being disposed", async () => {
    const boot = vi.fn();

    const app = await createApp({
      name: "TestApp",
      extensions: [{ name: "a", bootstrap: boot }],
    });

    await app.dispose();

    await expect(app.run()).rejects.toThrow("Cannot run a disposed application.");
    expect(boot).not.toHaveBeenCalled();
  });

  it("should prefer the configured timezone", async () => {
    await withTimezone("Europe/Paris", async () => {
      const app = await createApp({ name: "TestApp", timezone: "Asia/Tokyo" });

      expect(app.timezone).toBe("Asia/Tokyo");
      expect(env.TZ).toBe("Asia/Tokyo");
    });
  });

  it("should honor an existing TZ environment variable", async () => {
    await withTimezone("Europe/Paris", async () => {
      const app = await createApp({ name: "TestApp" });

      expect(app.timezone).toBe("Europe/Paris");
      expect(env.TZ).toBe("Europe/Paris");
    });
  });

  it("should default to UTC when no timezone is configured", async () => {
    await withTimezone(undefined, async () => {
      const app = await createApp({ name: "TestApp" });

      expect(app.timezone).toBe("UTC");
      expect(env.TZ).toBe("UTC");
    });
  });

  it("should only execute boots once even if run() is called multiple times", async () => {
    const BOOT = Symbol("BOOT");
    const bootFn = vi.fn();

    const app = await createApp({
      name: "BootTestApp",
      extensions: [
        {
          name: "BootExtension",
          providers: [
            {
              token: BOOT,
              factory() {
                return { name: "booted-service" };
              },
            },
          ],
          bootstrap: async () => {
            bootFn();
          },
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
              factory: () => ({
                dispose: () => {
                  order.push("dispose");
                },
              }),
            },
          ],
        },
      ],
      expose: {
        a: A,
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
          bootstrap: () => {
            throw new Error("Boot failed");
          },
        },
      ],
    });

    await expect(app.run()).rejects.toThrow("Boot failed");
  });

  it("should dispose the app and resolve nothing when initialization fails", async () => {
    const RESOURCE = Symbol("RESOURCE");
    const MISSING = Symbol("MISSING");
    const dispose = vi.fn();

    await expect(
      createApp({
        name: "TestApp",
        providers: [{ token: RESOURCE, factory: () => ({ dispose }) }],
        expose: { resource: RESOURCE, missing: MISSING },
      }),
    ).rejects.toThrow("No provider found for MISSING");

    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("should not resolve values when there is nothing to expose", async () => {
    const TOKEN = Symbol("TOKEN");
    const factory = vi.fn(() => ({ name: "service" }));

    const app = await createApp({
      name: "TestApp",
      providers: [{ token: TOKEN, factory }],
    });

    expect(factory).not.toHaveBeenCalled();
    expect(Object.keys(app.$)).toEqual([]);
  });

  describe("rootPath and runtimePath should handle simple paths", async () => {
    const app = await createApp({ name: "test-app" });

    const rootBase = cwd();
    const runtimeBase = nodePath.join(rootBase, "runtime");

    testPathMethod((...paths) => app.rootPath(...paths), rootBase);
    testPathMethod((...paths) => app.runtimePath(...paths), runtimeBase);
  });
});

describe("loadProviders", () => {
  it("should register class exports and resolve them through the container", async () => {
    class MyService {
      public readonly value = "resolved";
    }

    const app = await createApp({
      name: "TestApp",
      providers: loadProviders([{ MyService }]),
      expose: { myService: MyService },
    });

    expect(app.$.myService).toBeInstanceOf(MyService);
    expect(app.$.myService.value).toBe("resolved");
  });

  it("should keep explicit provider objects", async () => {
    const TOKEN = Symbol("TOKEN");
    const provider = { token: TOKEN, factory: () => ({ name: "explicit" }) };

    const providers = loadProviders([{ provider }]);

    expect(providers).toEqual([provider]);
  });

  it("should skip values that are neither providers nor constructible classes", async () => {
    const providers = loadProviders([
      {
        value: 42,
        text: "hello",
        nothing: null,
        Handler,
        lowerCaseHandler,
        async task() {
          return undefined;
        },
      },
    ]);

    expect(providers).toEqual([]);
  });

  it("should ignore objects that only look like providers", () => {
    const providers = loadProviders([
      { partial: { token: Symbol("TOKEN") } },
      { wrongFactory: { token: Symbol("TOKEN"), factory: "not a function" } },
      { noToken: { factory: () => undefined } },
    ]);

    expect(providers).toEqual([]);
  });

  it("should keep the last provider when a token is registered more than once", async () => {
    const TOKEN = Symbol("TOKEN");

    const providers = loadProviders([
      { first: { token: TOKEN, factory: () => "first" } },
      { second: { token: TOKEN, factory: () => "second" } },
    ]);

    expect(providers).toHaveLength(1);

    const app = await createApp({ name: "TestApp", providers });

    expect(app.get<string>(TOKEN)).toBe("second");
  });
});
