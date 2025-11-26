import type { CacheStore } from "../types";

export class NullCache implements Required<CacheStore> {
  async get<T>(_key: string): Promise<T> {
    return undefined as T;
  }

  async set(__key: string, _value: string, _ttl?: number): Promise<boolean> {
    return true;
  }

  async del(_key: string): Promise<boolean> {
    return true;
  }

  async clear(): Promise<boolean> {
    return true;
  }

  async getMultiple<T>(keys: string[]): Promise<(T | undefined)[]> {
    return keys.map(() => undefined);
  }

  async setMultiple(_values: Record<string, string>, _ttl?: number): Promise<boolean> {
    return true;
  }

  async delMultiple(_keys: string[]): Promise<boolean> {
    return true;
  }

  async has(_key: string): Promise<boolean> {
    return false;
  }

  async dispose(): Promise<void> {
    return;
  }
}
