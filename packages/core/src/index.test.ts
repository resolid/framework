import { describe, expect, it, type Mock, vi } from "vitest";
import { createApp, type Extension } from "./index";

describe("createApp", () => {
  it("should register extensions and resolve them", async () => {
    const LOG = Symbol("log");
    const MAIL = Symbol("mail");

    const logExtension: Extension = {
      name: LOG,
      factory: () => ({ log: vi.fn() }),
    };

    const mailExtension: Extension = {
      name: MAIL,
      factory: ({ config }) => ({ from: config?.form }),
    };

    const { context } = createApp({
      name: "TestApp",
      extensions: [logExtension, [mailExtension, { form: "from" }]],
    });

    const log = await context.resolve<{ log: Mock }>(LOG);

    expect(log).toHaveProperty("log");
    expect(typeof log.log).toBe("function");

    const mail = await context.resolve<{ from: string }>(MAIL);
    expect(mail.from).toBe("from");
  });

  it("should call boot functions", async () => {
    const order: string[] = [];

    const extA: Extension = {
      name: Symbol("A"),
      factory: () => ({}),
      boot: () => {
        order.push("A");
      },
    };
    const extB: Extension = {
      name: Symbol("B"),
      factory: () => ({}),
      boot: async () => {
        await new Promise((r) => setTimeout(r, 10));
        order.push("B");
      },
    };

    const { app } = createApp({
      name: "TestApp",
      extensions: [extA, extB],
    });

    await app.run();
    expect(order).toEqual(["A", "B"]);
  });

  it("should call dispose functions", async () => {
    const order: string[] = [];

    const A = Symbol("A");

    const extA: Extension = {
      name: A,
      factory: () => {
        return {
          dispose: () => {
            order.push("dispose");
          },
        };
      },
    };

    const { app, context } = createApp({
      name: "TestApp",
      extensions: [extA],
    });

    await app.run();

    await context.resolve<{ log: Mock }>(A);

    await app.dispose();

    expect(order).toEqual(["dispose"]);
  });

  it("should throw when boot fails", async () => {
    const errorExtension: Extension = {
      name: Symbol("fail"),
      factory: () => ({}),
      boot: () => {
        throw new Error("Boot failed");
      },
    };

    const { app } = createApp({
      name: "TestApp",
      debug: true,
      extensions: [errorExtension],
    });

    await expect(app.run()).rejects.toThrow("Boot failed");
  });
});
