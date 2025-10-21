export type CacheStore = {
  get: (key: string) => Promise<string | undefined>;
  set: (key: string, value: string, ttl?: number) => Promise<boolean>;
  del: (key: string) => Promise<boolean>;
  clear: () => Promise<boolean>;

  getMultiple?: (keys: string[]) => Promise<(string | undefined)[]>;
  setMultiple?: (values: Record<string, string>, ttl?: number) => Promise<boolean>;
  delMultiple?: (keys: string[]) => Promise<boolean>;
  has?: (key: string) => Promise<boolean>;

  dispose?: () => Promise<void> | void;
};
