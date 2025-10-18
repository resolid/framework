import { describe, expect, it, type Mock, vi } from "vitest";
import { createApp } from "./index";

describe("createApp", () => {
  it("should register extensions and resolve them", async () => {
    const LOG = "LOG";
    const MAIL = "MAIL";

    const { context } = createApp({
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
          extension: {
            name: "mail",
            factory: ({ config }) => ({ from: config?.from }),
          },
          config: { from: "1" },
        },
      ],
    });

    const log = await context.resolve<{ log: Mock }>(LOG);

    expect(log).toHaveProperty("log");
    expect(typeof log.log).toBe("function");

    const mail = await context.resolve<{ from: string }>(MAIL);
    expect(mail.from).toBe("1");
  });

  it("should call boot functions", async () => {
    const order: string[] = [];

    const { app } = createApp({
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

  it("should call dispose functions", async () => {
    const order: string[] = [];

    const A = "A";

    const { app, context } = createApp({
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

    await context.resolve<{ log: Mock }>(A);

    await app.dispose();

    expect(order).toEqual(["dispose"]);
  });

  it("should throw when boot fails", async () => {
    const { app } = createApp({
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
});
