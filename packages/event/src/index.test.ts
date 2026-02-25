import { beforeEach, describe, expect, it, vi } from "vitest";
import { Emitter } from "./index";

describe("createEmitter", () => {
  let emitter: Emitter;

  beforeEach(() => {
    emitter = new Emitter();
  });

  it("on & emit should call callback", () => {
    const callback = vi.fn();
    emitter.on("test", callback);

    emitter.emit("test", 1, "a");

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(1, "a");
  });

  it("off should remove specific callback", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    emitter.on("test", callback1);
    emitter.on("test", callback2);

    emitter.off("test", callback1);
    emitter.emit("test", 123);

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledWith(123);
  });

  it("offAll should remove all callbacks for a specific event", () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    emitter.on("a", cb1);
    emitter.on("a", cb2);
    emitter.on("b", vi.fn());

    emitter.offAll("a");
    emitter.emit("a", "x");
    emitter.emit("b", "y");

    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).not.toHaveBeenCalled();
  });

  it("offAll without argument should remove all events", () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    emitter.on("a", cb1);
    emitter.on("b", cb2);

    emitter.offAll();
    emitter.emit("a");
    emitter.emit("b");

    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).not.toHaveBeenCalled();
  });

  it("once should call only once", () => {
    const cb = vi.fn();
    emitter.once("event", cb);

    emitter.emit("event", 1);
    emitter.emit("event", 2);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(1);
  });

  it("on should return a function that unbinds the callback", () => {
    const cb = vi.fn();
    const off = emitter.on("event", cb);

    emitter.emit("event", "x");
    expect(cb).toHaveBeenCalledTimes(1);

    off(); // unbind
    emitter.emit("event", "y");
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("emitAsync should call callbacks asynchronously", async () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    emitter.on("asyncEvent", cb1);
    emitter.on("asyncEvent", cb2);

    emitter.emitAsync("asyncEvent", 42);

    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).not.toHaveBeenCalled();

    await Promise.resolve();

    expect(cb1).toHaveBeenCalledWith(42);
    expect(cb2).toHaveBeenCalledWith(42);
  });

  it("emitAsync should be safe if callback list changes during execution", async () => {
    const cb1 = vi.fn(() => emitter.offAll("event"));
    const cb2 = vi.fn();

    emitter.on("event", cb1);
    emitter.on("event", cb2);

    emitter.emitAsync("event");

    await Promise.resolve();

    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it("emit should do nothing if event has no listeners", () => {
    expect(() => emitter.emit("nonexistent")).not.toThrow();
  });

  it("off should do nothing if event or callback does not exist", () => {
    const cb = vi.fn();
    expect(() => emitter.off("nonexistent", cb)).not.toThrow();
  });
});
