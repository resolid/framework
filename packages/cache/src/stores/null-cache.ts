import type { CacheStore } from "../types";

export class NullCache implements Required<CacheStore> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async get<T>(_: string): Promise<T> {
    return undefined as T;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async set(_key: string, _value: string, _ttl?: number): Promise<boolean> {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async del(_key: string): Promise<boolean> {
    return true;
  }

  async clear(): Promise<boolean> {
    return true;
  }

  async getMultiple<T>(_keys: string[]): Promise<(T | undefined)[]> {
    return _keys.map(() => undefined);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async setMultiple(_values: Record<string, string>, _ttl?: number): Promise<boolean> {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delMultiple(_keys: string[]): Promise<boolean> {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async has(_key: string): Promise<boolean> {
    return false;
  }

  async dispose(): Promise<void> {
    return;
  }
}
