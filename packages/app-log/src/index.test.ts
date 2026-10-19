import type { LogRecord, Sink } from "@logtape/logtape";
import type { AppContext } from "@resolid/app";
import { getConfig } from "@logtape/logtape";
import { createApp } from "@resolid/app";
import { access, rm } from "node:fs/promises";
import nodePath from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogExtension, type LogExtensionConfig, LogService } from "./index";
import {
  fileTarget,
  rotatingFileTarget,
  streamFileTarget,
  timeRotatingFileTarget,
} from "./targets/file-target";

const disposers: (() => Promise<void>)[] = [];

async function createTestApp(config: LogExtensionConfig = {}) {
  const app = await createApp({
    name: "TestApp",
    debug: true,
    extensions: [createLogExtension(config)],
    expose: {
      logger: LogService,
    },
  });

  disposers.push(() => app.dispose());

  await app.run();

  return app;
}

function memorySink(records: LogRecord[] = []): Sink {
  return (record) => {
    records.push(record);
  };
}

afterEach(async () => {
  for (const dispose of disposers.splice(0).reverse()) {
    // oxlint-disable-next-line no-await-in-loop
    await dispose();
  }

  vi.restoreAllMocks();
});

describe("LogService", () => {
  it("exposes the category logging methods", async () => {
    const app = await createTestApp();
    const logger = app.$.logger.category("user");

    expect(logger).toHaveProperty("debug");
    expect(logger).toHaveProperty("info");
    expect(logger).toHaveProperty("warn");
    expect(logger).toHaveProperty("error");
    expect(logger).toHaveProperty("fatal");
  });

  it("returns the same logger for the same category", async () => {
    const app = await createTestApp();

    expect(app.$.logger.category("user")).toBe(app.$.logger.category("user"));
  });

  it("delegates to the underlying logger methods", async () => {
    const app = await createTestApp();
    const logger = app.$.logger.category("user");
    const underlyingLogger = app.$.logger.getLogger("user");

    const spyDebug = vi.spyOn(underlyingLogger, "debug");

    logger.debug("test message");

    expect(spyDebug).toHaveBeenCalledWith("test message");
  });

  it("supports object, function, and template string messages", async () => {
    const app = await createTestApp({
      targets: {
        record: () => memorySink(),
      },
      defaultTarget: "record",
    });

    const userId = 456;

    expect(() => app.$.logger.info({ userId: 123 })).not.toThrow();
    expect(() => app.$.logger.warn({ userId: 123 })).not.toThrow();
    expect(() => app.$.logger.fatal({ userId: 123 })).not.toThrow();
    expect(() => app.$.logger.error(() => [{ error: "fail" }])).not.toThrow();
    expect(() => app.$.logger.debug`User ${userId} logged in`).not.toThrow();
  });

  it("routes the default category to defaultTarget", async () => {
    const records: LogRecord[] = [];
    const app = await createTestApp({
      targets: {
        record: () => memorySink(records),
      },
      defaultTarget: "record",
    });

    app.$.logger.info("hello");

    expect(records).toHaveLength(1);
    expect(records[0]!.category).toEqual(["TestApp"]);
    expect(records[0]!.message).toEqual(["hello"]);
  });

  it("keeps the console sink as the default target", async () => {
    const records: LogRecord[] = [];
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const app = await createTestApp({
      targets: {
        record: () => memorySink(records),
      },
    });

    app.$.logger.info("hello");

    expect(records).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it("uses a custom defaultCategory", async () => {
    const records: LogRecord[] = [];
    const app = await createTestApp({
      defaultCategory: "custom",
      targets: {
        record: () => memorySink(records),
      },
      defaultTarget: "record",
    });

    app.$.logger.info("hello");

    expect(records[0]!.category).toEqual(["custom"]);
  });

  it("supports explicit logger configurations", async () => {
    const records: LogRecord[] = [];
    const app = await createTestApp({
      targets: {
        record: () => memorySink(records),
      },
      loggers: [{ category: "user", sinks: ["record"], parentSinks: "override" }],
    });

    app.$.logger.category("user").info("hello");

    expect(records).toHaveLength(1);
    expect(records[0]!.category).toEqual(["user"]);
  });

  it("creates targets with the app context", async () => {
    let received: AppContext | undefined;

    await createTestApp({
      targets: {
        record: (ctx) => {
          received = ctx;

          return memorySink();
        },
      },
    });

    expect(received).toMatchObject({ name: "TestApp" });
  });

  it("rejects an unknown defaultTarget", () => {
    expect(() => createLogExtension({ defaultTarget: "missing" })).toThrow(
      'Default target "missing" does not exist. Available targets: console, default.',
    );

    expect(() => new LogService({ defaultTarget: "missing" })).toThrow(
      'Default target "missing" does not exist. Available targets: console, default.',
    );

    expect(() => new LogService()).not.toThrow();
  });

  it("allows overriding the built-in default sink", async () => {
    const records: LogRecord[] = [];
    const service = new LogService({ sinks: { default: memorySink(records) } });

    await service.configure();
    service.info("hello");
    await service.dispose();

    expect(records).toHaveLength(1);
  });

  it("forwards filters to the logger configuration", async () => {
    const records: LogRecord[] = [];
    const service = new LogService({
      sinks: { default: memorySink(records) },
      filters: {
        onlyError: (record) => record.level === "error",
      },
      loggers: [
        {
          category: "filtered",
          sinks: ["default"],
          filters: ["onlyError"],
          parentSinks: "override",
        },
      ],
    });

    await service.configure();
    service.category("filtered").info("ignored");
    service.category("filtered").error("kept");
    await service.dispose();

    expect(records).toHaveLength(1);
    expect(records[0]!.message).toEqual(["kept"]);
  });

  it("forwards contextLocalStorage to the configuration", async () => {
    const storage = {
      run<R>(_store: Record<string, unknown>, callback: () => R): R {
        return callback();
      },
      getStore(): Record<string, unknown> | undefined {
        return undefined;
      },
    };

    const service = new LogService({ contextLocalStorage: storage });

    await service.configure();

    expect(getConfig()?.contextLocalStorage).toBe(storage);

    await service.dispose();
  });

  it("disposes target sinks when the app is disposed", async () => {
    const disposeSink = vi.fn();
    const sink: Sink & Disposable = Object.assign(memorySink(), {
      [Symbol.dispose]: disposeSink,
    });

    const app = await createTestApp({
      targets: {
        record: () => sink,
      },
      defaultTarget: "record",
    });

    await app.dispose();

    expect(disposeSink).toHaveBeenCalledTimes(1);
  });

  it("supports file targets", async () => {
    const logPath = nodePath.join(process.cwd(), "runtime", "logs");
    const files = ["file.log", "stream-file.log", "rotating-file.log"];

    await Promise.all(files.map((file) => rm(nodePath.join(logPath, file), { force: true })));

    const app = await createTestApp({
      targets: {
        file: (ctx) => fileTarget(ctx, "file"),
        streamFile: (ctx) => streamFileTarget(ctx, "stream-file"),
        rotatingFile: (ctx) => rotatingFileTarget(ctx, "rotating-file"),
        timeRotatingFile: (ctx) => timeRotatingFileTarget(ctx, { directory: "time-rotating-file" }),
      },
      defaultTarget: "file",
      loggers: [
        { category: "stream", sinks: ["streamFile"], parentSinks: "override" },
        { category: "rotating", sinks: ["rotatingFile"], parentSinks: "override" },
        { category: "time", sinks: ["timeRotatingFile"], parentSinks: "override" },
      ],
    });

    app.$.logger.info("file message");
    app.$.logger.category("stream").info("stream message");
    app.$.logger.category("rotating").info("rotating message");
    app.$.logger.category("time").info("time message");

    await app.dispose();

    await Promise.all(
      files.map((file) => expect(access(nodePath.join(logPath, file))).resolves.toBeUndefined()),
    );

    await expect(access(nodePath.join(logPath, "time-rotating-file"))).resolves.toBeUndefined();
  });
});
