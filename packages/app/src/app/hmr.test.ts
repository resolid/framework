import { describe, expect, it, vi } from "vitest";
import { disposeApp, forgetApp, type HotContext, rememberApp } from "./hmr";

const createHot = (): HotContext => ({ data: {} });

describe("disposeResolidApp", () => {
  it("should dispose the app of the previous evaluation and clear the slot", async () => {
    const dispose = vi.fn();
    const hot = createHot();

    rememberApp(hot, { dispose });

    await disposeApp(hot);

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(hot.data.resolidApp).toBeUndefined();
  });

  it("should do nothing when there is no previous app", async () => {
    const hot = createHot();

    await expect(disposeApp(hot)).resolves.toBeUndefined();
  });

  it("should clear the slot before awaiting so a re-entrant call cannot dispose twice", async () => {
    const order: string[] = [];
    const hot = createHot();

    rememberApp(hot, {
      dispose: async () => {
        order.push("dispose:start");

        await disposeApp(hot);

        order.push("dispose:end");
      },
    });

    await disposeApp(hot);

    expect(order).toEqual(["dispose:start", "dispose:end"]);
  });

  it("should keep the new app startable when the previous app fails to dispose", async () => {
    const error = new Error("dispose failed");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const hot = createHot();

    rememberApp(hot, { dispose: () => Promise.reject(error) });

    await expect(disposeApp(hot)).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith("[resolid] Error during hot reload dispose:", error);
    expect(hot.data.resolidApp).toBeUndefined();

    consoleError.mockRestore();
  });
});

describe("forgetApp", () => {
  it("should clear the slot when it still holds the given app", () => {
    const hot = createHot();
    const app = { dispose: vi.fn() };

    rememberApp(hot, app);
    forgetApp(hot, app);

    expect(hot.data.resolidApp).toBeUndefined();
  });

  it("should keep a newer app when the slot was replaced", () => {
    const hot = createHot();
    const stale = { dispose: vi.fn() };
    const current = { dispose: vi.fn() };

    rememberApp(hot, stale);
    rememberApp(hot, current);
    forgetApp(hot, stale);

    expect(hot.data.resolidApp).toBe(current);
  });
});
