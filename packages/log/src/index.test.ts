import { createApp } from "@resolid/core";
import { describe, expect, it, vi } from "vitest";
import { LOG_SYMBOL, logExtension, type LogService } from "./index";

describe("logExtension", () => {
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
});
