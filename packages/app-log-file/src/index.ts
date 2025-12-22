import {
  type FileSinkOptions,
  getFileSink,
  getRotatingFileSink,
  getStreamFileSink,
  type RotatingFileSinkOptions,
  type StreamFileSinkOptions,
} from "@logtape/file";
import type { Sink } from "@resolid/app-log";
import type { ExtensionCreator, PathResolver } from "@resolid/core";
import { mkdir } from "node:fs";
import { join } from "node:path";

export class FileLogService {
  private readonly _path: string;

  constructor(runtimePath: PathResolver) {
    this._path = runtimePath("logs");

    mkdir(this._path, { recursive: true }, () => {});
  }

  private _getFilePath(file: string) {
    return join(this._path, `${file}.log`);
  }

  fileSink(file: string, options?: FileSinkOptions): Sink & Disposable {
    return getFileSink(this._getFilePath(file), options);
  }

  streamFileSink(file: string, options?: StreamFileSinkOptions): Sink & AsyncDisposable {
    return getStreamFileSink(this._getFilePath(file), options);
  }

  rotatingFileSink(file: string, options?: RotatingFileSinkOptions): Sink & Disposable {
    return getRotatingFileSink(this._getFilePath(file), options);
  }
}

export function createFileLogExtension(): ExtensionCreator {
  return (context) => {
    return {
      name: "resolid-file-log-module",
      providers: [
        {
          token: FileLogService,
          factory() {
            return new FileLogService(context.runtimePath);
          },
        },
      ],
    };
  };
}
