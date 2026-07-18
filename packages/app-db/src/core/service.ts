import type { AppContext, Emitter, ExtensionCreator } from "@resolid/core";
import type { AnyRelations, EmptyRelations } from "drizzle-orm/relations";
import { DefaultLogger, type DrizzleConfig, type Logger } from "drizzle-orm";
import type { DatabaseConnection } from "./connection";

export type DatabaseConfig<
  C,
  TSchema extends Record<string, unknown> = Record<string, never>,
  TRelationConfigs extends AnyRelations = EmptyRelations,
> = (C extends Record<string, infer T>
  ? {
      connections: { [K in keyof C]: DatabaseConnection<T, TSchema, TRelationConfigs> };
      connection?: never;
    }
  : { connection: DatabaseConnection<C, TSchema, TRelationConfigs>; connections?: never }) & {
  drizzleConfig?: DrizzleConfig<TSchema, TRelationConfigs>;
};

interface AppDbEvents {
  "db:query": [connection: string, query: string, params: unknown[]];
}

declare module "@resolid/core" {
  // oxlint-disable-next-line typescript/no-empty-object-type
  export interface AppEvents extends AppDbEvents {}
}

export class DatabaseService<
  C,
  TSchema extends Record<string, unknown> = Record<string, never>,
  TRelationConfigs extends AnyRelations = EmptyRelations,
> {
  private readonly _emitter: Emitter<AppDbEvents>;
  private readonly _config: DatabaseConfig<C, TSchema, TRelationConfigs>;
  private readonly _connections: Map<
    string,
    C extends Record<string, infer T>
      ? DatabaseConnection<T, TSchema, TRelationConfigs>
      : DatabaseConnection<C, TSchema, TRelationConfigs>
  > = new Map();

  private readonly _defaultSource = "main";

  constructor(config: DatabaseConfig<C, TSchema, TRelationConfigs>, context: AppContext) {
    this._config = config;
    this._emitter = context.emitter;
  }

  async connect(): Promise<void> {
    const connections = (this._config.connections ?? {
      [this._defaultSource]: this._config.connection,
    }) as Record<
      string,
      C extends Record<string, infer T>
        ? DatabaseConnection<T, TSchema, TRelationConfigs>
        : DatabaseConnection<C, TSchema, TRelationConfigs>
    >;

    const { logger, jit = true, ...rest } = this._config.drizzleConfig ?? {};

    const createLogger = (connection: string): Logger => ({
      logQuery: (query, params) => {
        this._emitter.emit("db:query", connection, query, params);

        if (logger === true) {
          new DefaultLogger().logQuery(query, params);
        } else if (logger !== false) {
          logger?.logQuery(query, params);
        }
      },
    });

    for (const [key, conn] of Object.entries(connections)) {
      // oxlint-disable-next-line no-await-in-loop
      await conn.connect({ logger: createLogger(key), jit, ...rest });

      this._connections.set(key, conn);
    }
  }

  async dispose(): Promise<void> {
    for (const conn of this._connections.values()) {
      // oxlint-disable-next-line no-await-in-loop
      await conn.close();
    }

    this._connections.clear();
  }

  get<T>(name: string = this._defaultSource) {
    const conn = this._connections.get(name);

    if (!conn) {
      throw new Error(`Connection with name ${String(name)} does not exist.`);
    }

    return conn.getDb() as T;
  }
}

export function createDatabaseExtension<
  C,
  TSchema extends Record<string, unknown> = Record<string, never>,
  TRelationConfigs extends AnyRelations = EmptyRelations,
>(config: DatabaseConfig<C, TSchema, TRelationConfigs>): ExtensionCreator {
  return (context) => ({
    name: "resolid-db-module",
    providers: [
      {
        token: DatabaseService,
        factory() {
          return new DatabaseService(config, context);
        },
      },
    ],
    async bootstrap() {
      await context.container.get(DatabaseService).connect();
    },
  });
}
