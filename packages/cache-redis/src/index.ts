import type { CacheStore } from "@resolid/cache/stores";
import {
  createClient,
  createCluster,
  createSentinel,
  type RedisClientOptions,
  type RedisClientType,
  type RedisClusterOptions,
  type RedisClusterType,
  type RedisSentinelOptions,
  type RedisSentinelType,
} from "@redis/client";
import calculateSlot from "cluster-key-slot";

export type RedisCacheOptions = {
  namespace?: string;
  connectionTimeout?: number | null;
  clearBatchSize?: number;
  forceClose?: boolean;
};

export class RedisCache implements CacheStore {
  private readonly _client: RedisClientType | RedisClusterType | RedisSentinelType;
  private readonly _options: Required<RedisCacheOptions>;
  private readonly _isCluster: boolean = false;

  private _connectPromise?: Promise<void>;

  constructor(
    connect?:
      | string
      | Omit<RedisClientOptions, "RESP">
      | Omit<RedisClusterOptions, "RESP">
      | Omit<RedisSentinelOptions, "RESP">,
    options?: RedisCacheOptions,
  ) {
    const socket = {
      reconnectStrategy: (retries: number) => {
        return Math.min(2 ** retries * 100, 2000) + (Math.random() - 0.5) * 100;
      },
    };

    if (connect && typeof connect === "object") {
      if ("sentinelRootNodes" in connect) {
        this._client = createSentinel(connect);
      } else if ("rootNodes" in connect) {
        this._client = createCluster({
          ...connect,
          defaults: {
            ...connect.defaults,
            socket: {
              ...connect.defaults?.socket,
              ...socket,
            },
          },
        }) as unknown as RedisClusterType;
        this._isCluster = true;
      } else {
        this._client = createClient({
          ...connect,
          socket: {
            ...connect.socket,
            ...socket,
          },
        });
      }
    } else {
      this._client = createClient({ url: connect, socket });
    }

    this._options = {
      namespace: "rs",
      forceClose: false,
      connectionTimeout: null,
      clearBatchSize: 1000,
      ...options,
    };
  }

  private _resolve(key: string): string {
    return `${this._options.namespace}::${key}`;
  }

  private async _connect() {
    try {
      if (this._options.connectionTimeout == null) {
        await this._client.connect();
      } else {
        const connectPromise = this._client.connect();
        let timeout: ReturnType<typeof setTimeout> | undefined;

        try {
          await Promise.race([
            connectPromise,
            new Promise<never>((_, reject) => {
              timeout = setTimeout(() => {
                reject(new Error(`Redis timed out after ${this._options.connectionTimeout}ms`));
              }, this._options.connectionTimeout as number);
            }),
          ]);
        } finally {
          if (timeout) {
            clearTimeout(timeout);
          }
        }
      }
    } catch (e) {
      await this._dispose(true);

      throw e;
    }
  }

  private async _getClient() {
    if (this._client.isOpen) {
      return this._client;
    }

    this._connectPromise ??= this._connect().finally(() => {
      this._connectPromise = undefined;
    });

    await this._connectPromise;

    return this._client;
  }

  private async _getMasterNodes() {
    const client = await this._getClient();

    if (this._isCluster) {
      const cluster = client as RedisClusterType;

      const nodes = cluster.masters.map(async (main) => cluster.nodeClient(main));

      // noinspection ES6MissingAwait
      return Promise.all(nodes) as Promise<RedisClientType[]>;
    }

    return [client as RedisClientType];
  }

  private _getSlotMap(keys: string[]) {
    const slotMap: Map<number, string[]> = new Map();

    if (this._isCluster) {
      for (const key of keys) {
        const slot = calculateSlot(key);
        const slotKeys = slotMap.get(slot) ?? [];

        slotKeys.push(key);
        slotMap.set(slot, slotKeys);
      }
    } else {
      slotMap.set(0, keys);
    }

    return slotMap;
  }

  private async _getSlotMaster(slot: number) {
    const client = await this._getClient();

    if (this._isCluster) {
      const cluster = client as RedisClusterType;

      return (await cluster.nodeClient(cluster.slots[slot]!.master)) as RedisClientType;
    }

    return client as RedisClientType;
  }

  async has(key: string): Promise<boolean> {
    const client = await this._getClient();

    try {
      const exists = await client.exists(this._resolve(key));

      return exists === 1;
    } catch {
      return false;
    }
  }

  async get(key: string): Promise<string | undefined> {
    const client = await this._getClient();

    try {
      const value = await client.get(this._resolve(key));

      if (value === null) {
        return undefined;
      }

      return value;
    } catch {
      return undefined;
    }
  }

  async getMultiple(keys: string[]): Promise<(string | undefined)[]> {
    if (keys.length === 0) {
      return [];
    }

    const namespaceKeys = keys.map((k) => this._resolve(k));

    try {
      if (this._isCluster) {
        const valueMap: Map<string, string | undefined> = new Map();

        await Promise.all(
          Array.from(this._getSlotMap(namespaceKeys), async ([slot, slotKeys]) => {
            const master = await this._getSlotMaster(slot);
            const values = await master.mGet(slotKeys);

            for (const [index, value] of values.entries()) {
              valueMap.set(slotKeys[index]!, value ?? undefined);
            }
          }),
        );

        return namespaceKeys.map((key) => valueMap.get(key));
      }

      const client = await this._getClient();
      const values = await client.mGet(namespaceKeys);

      return values.map((v) => v ?? undefined);
    } catch {
      return Array.from({ length: keys.length }).fill(undefined) as undefined[];
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    const client = await this._getClient();

    try {
      await client.set(
        this._resolve(key),
        value,
        ttl ? { expiration: { type: "PX", value: ttl } } : undefined,
      );

      return true;
    } catch {
      return false;
    }
  }

  async setMultiple(values: Record<string, string>, ttl?: number): Promise<boolean> {
    try {
      if (this._isCluster) {
        const slotMap: Map<number, Record<string, string>> = new Map();

        for (const [key, value] of Object.entries(values)) {
          const namespaceKey = this._resolve(key);
          const slot = calculateSlot(namespaceKey);

          const group = slotMap.get(slot) ?? {};
          group[namespaceKey] = value;
          slotMap.set(slot, group);
        }

        await Promise.all(
          Array.from(slotMap.entries(), async ([slot, slotValues]) => {
            const master = await this._getSlotMaster(slot);
            const commands = master.multi();

            for (const [key, value] of Object.entries(slotValues)) {
              if (ttl) {
                commands.set(key, value, {
                  expiration: { type: "PX", value: ttl },
                });
              } else {
                commands.set(key, value);
              }
            }

            await commands.exec();
          }),
        );
      } else {
        const commands = ((await this._getClient()) as RedisClientType).multi();

        for (const [key, value] of Object.entries(values)) {
          if (ttl) {
            commands.set(this._resolve(key), value, {
              expiration: { type: "PX", value: ttl },
            });
          } else {
            commands.set(this._resolve(key), value);
          }
        }

        await commands.exec();
      }

      return true;
    } catch {
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    const client = await this._getClient();

    try {
      const deleted = await client.del(this._resolve(key));

      return deleted > 0;
    } catch {
      return false;
    }
  }

  async delMultiple(keys: string[]): Promise<boolean> {
    if (keys.length === 0) {
      return true;
    }

    const namespaceKeys = keys.map((k) => this._resolve(k));

    try {
      // oxlint-disable-next-line unicorn/prefer-ternary
      if (this._isCluster) {
        await Promise.all(
          Array.from(this._getSlotMap(namespaceKeys), async ([slot, slotKeys]) => {
            const master = await this._getSlotMaster(slot);
            const commands = master.multi();

            for (const key of slotKeys) {
              commands.del(key);
            }

            await commands.exec();
          }),
        );
      } else {
        const client = await this._getClient();
        await client.del(namespaceKeys);
      }

      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<boolean> {
    try {
      const clients = await this._getMasterNodes();

      await Promise.all(
        clients.map(async (client) => {
          let cursor = "0";
          const batchSize = this._options.clearBatchSize;
          const match = this._resolve("*");

          do {
            // oxlint-disable-next-line no-await-in-loop
            const result = await client.scan(cursor, {
              MATCH: match,
              COUNT: batchSize,
              TYPE: "string",
            });

            cursor = result.cursor.toString();

            if (result.keys.length > 0) {
              // oxlint-disable-next-line no-await-in-loop
              await Promise.all(
                Array.from(this._getSlotMap(result.keys).entries(), async ([slot, slotKeys]) => {
                  const master = await this._getSlotMaster(slot);
                  await master.del(slotKeys);
                }),
              );
            }
          } while (cursor !== "0");
        }),
      );

      return true;
    } catch {
      return false;
    }
  }

  private async _dispose(forceClose: boolean): Promise<void> {
    if (this._client.isOpen) {
      await (forceClose ? this._client.destroy() : this._client.close());
    }
  }

  async dispose(): Promise<void> {
    await this._dispose(this._options.forceClose);
  }
}
