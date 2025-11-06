import { createApp } from "@resolid/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLogExtension, LogService } from "./index";

describe("logExtension", () => {
  let log: LogService;

  beforeEach(async () => {
    const app = await createApp({
      name: "TestApp",
      debug: true,
      extensions: [createLogExtension([])],
      expose: {
        logger: {
          token: LogService,
          async: true,
        },
      },
    });

    await app.run();

    log = app.$.logger;
  });

  it("should return an object with 5 methods", () => {
    const userLogger = log.category("user");
    expect(userLogger).toHaveProperty("debug");
    expect(userLogger).toHaveProperty("info");
    expect(userLogger).toHaveProperty("warn");
    expect(userLogger).toHaveProperty("error");
    expect(userLogger).toHaveProperty("fatal");
  });

  it("should call the underlying logger methods", () => {
    const userLogger = log.category("user");
    const underlyingLogger = log.getLogger("user");

    const spyDebug = vi.spyOn(underlyingLogger, "debug");

    userLogger.debug("test message");

    expect(spyDebug).toHaveBeenCalledWith("test message");
  });

  it("should return the same logger for the same category", () => {
    const logger1 = log.category("user");
    const logger2 = log.category("user");

    expect(logger1).toBe(logger2);
  });

  it("should support object, function, and template string messages", () => {
    expect(() => log.info({ userId: 123 })).not.toThrow();
    expect(() => log.warn({ userId: 123 })).not.toThrow();
    expect(() => log.fatal({ userId: 123 })).not.toThrow();
    expect(() => log.error(() => [{ error: "fail" }])).not.toThrow();

    const userId = 456;

    expect(() => log.debug`User ${userId} logged in`).not.toThrow();
  });
});
