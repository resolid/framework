import type { Sink } from "@logtape/logtape";
import type { AppContext } from "@resolid/core";
import {
  type FileSinkOptions,
  getFileSink,
  getRotatingFileSink,
  getStreamFileSink,
  getTimeRotatingFileSink,
  type RotatingFileSinkOptions,
  type StreamFileSinkOptions,
  type TimeRotatingFileSinkOptions,
} from "@logtape/file";
import { mkdirSync } from "node:fs";
import nodePath from "node:path";

function getLogFilePath(file: string, runtimePath: AppContext["runtimePath"]) {
  const logPath = runtimePath("logs");

  mkdirSync(logPath, { recursive: true });

  return nodePath.join(logPath, `${file}.log`);
}

export function fileTarget(
  ctx: AppContext,
  file: string,
  options?: FileSinkOptions,
): Sink & Disposable {
  return getFileSink(getLogFilePath(file, ctx.runtimePath), options);
}

export function streamFileTarget(
  ctx: AppContext,
  file: string,
  options?: StreamFileSinkOptions,
): Sink & AsyncDisposable {
  return getStreamFileSink(getLogFilePath(file, ctx.runtimePath), options);
}

export function rotatingFileTarget(
  ctx: AppContext,
  file: string,
  options?: RotatingFileSinkOptions,
): Sink & Disposable {
  return getRotatingFileSink(getLogFilePath(file, ctx.runtimePath), options);
}

export function timeRotatingFileTarget(
  ctx: AppContext,
  options: TimeRotatingFileSinkOptions,
): Sink & Disposable {
  const { directory, ...rest } = options;

  return getTimeRotatingFileSink({ directory: ctx.runtimePath("logs", directory), ...rest });
}
