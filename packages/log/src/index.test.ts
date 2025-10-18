import { createApp } from "@resolid/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOG_SYMBOL, logExtension, type LogService } from "./index";

describe("logExtension", () => {
  let log: LogService;

  beforeEach(async () => {
    const { context } = createApp({
      name: "TestApp",
      debug: true,
      extensions: [logExtension],
    });

    log = await context.resolve(LOG_SYMBOL);
  });

  it("should have correct symbol name", () => {
    expect(typeof LOG_SYMBOL).toBe("symbol");
  });

  it("should log initialization message", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { context } = createApp({
      name: "TestApp",
      debug: true,
      extensions: [logExtension],
    });

    await context.resolve<LogService>(LOG_SYMBOL);

    expect(consoleSpy).toHaveBeenCalledWith(`[TestApp] Initializing log extension...`);
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
    const userLogger = log.category("user");

    expect(() => userLogger.info({ userId: 123 })).not.toThrow();
    expect(() => userLogger.warn({ userId: 123 })).not.toThrow();
    expect(() => userLogger.fatal({ userId: 123 })).not.toThrow();

    expect(() => userLogger.error(() => [{ error: "fail" }])).not.toThrow();

    const userId = 456;

    expect(() => userLogger.debug`User ${userId} logged in`).not.toThrow();
  });
});
