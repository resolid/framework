import type { CacheStore } from "@resolid/cache/stores";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const INVALID_KEY_RE = /(\.\/|\.\.\/)/;

export class FileCache implements CacheStore {
  private readonly _basePath: string;
  private readonly _locks = new Map<string, Promise<void>>();

  constructor(basePath: string) {
    this._basePath = basePath;
  }

  private _resolve(key: string) {
    if (INVALID_KEY_RE.test(key)) {
      throw new Error(`Invalid key: ${key}. Should not contain relative paths.`);
    }

    return join(this._basePath, key.replaceAll(":", "/"));
  }

  private async _exists(path: string) {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  private async _lockedRun<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // noinspection ES6MissingAwait
    const prev = this._locks.get(key) ?? Promise.resolve();

    let release!: () => void;
    const current = new Promise<void>((r) => (release = r));

    this._locks.set(
      key,
      prev.then(() => current),
    );

    try {
      await prev;
      return await fn();
    } finally {
      release();
      /* istanbul ignore next -- @preserve */
      if (this._locks.get(key) === current) {
        this._locks.delete(key);
      }
    }
  }

  async get(key: string): Promise<string | undefined> {
    const path = this._resolve(key);

    try {
      const content = await readFile(path, { encoding: "utf-8" });

      const [value, expire] = JSON.parse(content);

      if (expire !== -1 && expire < Date.now()) {
        await rm(path, { force: true });

        return undefined;
      }

      return value as string;
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    const path = this._resolve(key);

    return this._lockedRun(key, async () => {
      await mkdir(dirname(path), { recursive: true });

      await writeFile(path, JSON.stringify([value, ttl ? Date.now() + ttl * 1000 : -1]));

      return true;
    });
  }

  async del(key: string): Promise<boolean> {
    const path = this._resolve(key);

    const exists = await this._exists(path);

    if (!exists) {
      return false;
    }

    return this._lockedRun(key, async () => {
      await rm(path);

      return true;
    });
  }

  async clear(): Promise<boolean> {
    await rm(this._basePath, { recursive: true, force: true });
    this._locks.clear();
    return true;
  }
}
