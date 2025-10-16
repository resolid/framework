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
    const channel = log.channel("user");
    expect(channel).toHaveProperty("debug");
    expect(channel).toHaveProperty("info");
    expect(channel).toHaveProperty("warn");
    expect(channel).toHaveProperty("error");
    expect(channel).toHaveProperty("fatal");
  });

  it("should call the underlying logger methods", () => {
    const logger = log.channel("user");

    const underlyingLogger = log.getLogger("user");

    const spyDebug = vi.spyOn(underlyingLogger, "debug");

    logger.debug("test message");

    expect(spyDebug).toHaveBeenCalledWith("test message");
  });

  it("should return the same channel object for the same category", () => {
    const ch1 = log.channel("user");
    const ch2 = log.channel("user");

    expect(ch1).toBe(ch2);
  });

  it("should support object, function, and template string messages", () => {
    const logger = log.channel("user");

    expect(() => logger.info({ userId: 123 })).not.toThrow();
    expect(() => logger.warn({ userId: 123 })).not.toThrow();
    expect(() => logger.fatal({ userId: 123 })).not.toThrow();

    expect(() => logger.error(() => [{ error: "fail" }])).not.toThrow();

    const userId = 456;

    expect(() => logger.debug`User ${userId} logged in`).not.toThrow();
  });
});
