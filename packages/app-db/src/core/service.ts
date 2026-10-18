import type { AppContext, Emitter, ExtensionCreator } from "@resolid/app";
import type { AnyRelations, EmptyRelations } from "drizzle-orm/relations";
import { DefaultLogger, type DrizzleConfig, type Logger } from "drizzle-orm";
import type { DatabaseConnection } from "./connection";

export type DatabaseConfig<
  C,
  P,
  TSchema extends Record<string, unknown> = Record<string, never>,
  TRelationConfigs extends AnyRelations = EmptyRelations,
> = (C extends Record<string, infer T>
  ? {
      connections: { [K in keyof C]: DatabaseConnection<T, P, TSchema, TRelationConfigs> };
      connection?: never;
    }
  : { connection: DatabaseConnection<C, P, TSchema, TRelationConfigs>; connections?: never }) & {
  drizzleConfig?: DrizzleConfig<TSchema, TRelationConfigs>;
};

type DatabaseConnectionOf<
  C,
  P,
  TSchema extends Record<string, unknown>,
  TRelationConfigs extends AnyRelations,
> =
  C extends Record<string, infer T>
    ? DatabaseConnection<T, P, TSchema, TRelationConfigs>
    : DatabaseConnection<C, P, TSchema, TRelationConfigs>;

interface AppDbEvents {
  "db:query": [connection: string, query: string, params: unknown[]];
}

declare module "@resolid/app" {
  // oxlint-disable-next-line typescript/no-empty-object-type
  export interface AppEvents extends AppDbEvents {}
}

export class DatabaseService<
  C = unknown,
  P = unknown,
  TSchema extends Record<string, unknown> = Record<string, never>,
  TRelationConfigs extends AnyRelations = EmptyRelations,
> {
  private readonly _emitter: Emitter<AppDbEvents>;
  private readonly _config: DatabaseConfig<C, P, TSchema, TRelationConfigs>;
  private readonly _connections: Map<
    string,
    DatabaseConnectionOf<C, P, TSchema, TRelationConfigs>
  > = new Map();

  private readonly _defaultSource = "main";

  private _connected = false;

  constructor(config: DatabaseConfig<C, P, TSchema, TRelationConfigs>, context: AppContext) {
    this._config = config;
    this._emitter = context.emitter;
  }

  async connect(): Promise<void> {
    if (this._connected) {
      return;
    }

    const connections = (this._config.connections ?? {
      [this._defaultSource]: this._config.connection,
    }) as Record<string, DatabaseConnectionOf<C, P, TSchema, TRelationConfigs>>;

    const { logger, jit = true, ...rest } = this._config.drizzleConfig ?? {};

    const loggerImpl: Logger | undefined =
      logger === true ? new DefaultLogger() : typeof logger === "object" ? logger : undefined;

    const createLogger = (connection: string): Logger => ({
      logQuery: (query, params) => {
        this._emitter.emit("db:query", connection, query, params);
        loggerImpl?.logQuery(query, params);
      },
    });

    await Promise.all(
      Object.entries(connections).map(async ([key, conn]) => {
        await conn.connect({ logger: createLogger(key), jit, ...rest });

        this._connections.set(key, conn);
      }),
    );

    this._connected = true;
  }

  async dispose(): Promise<void> {
    const connections = [...this._connections.values()];

    this._connections.clear();
    this._connected = false;

    const results = await Promise.allSettled(connections.map(async (conn) => conn.close()));
    const errors = results.filter((result) => result.status === "rejected");

    if (errors.length > 0) {
      const message = errors
        .map((error) =>
          error.reason instanceof Error ? error.reason.message : String(error.reason),
        )
        .join("; ");

      throw new Error(`Failed to close ${errors.length} database connection(s): ${message}`);
    }
  }

  get<T>(name: string = this._defaultSource): T {
    const conn = this._connections.get(name);

    if (!conn) {
      throw new Error(`Connection with name ${name} does not exist.`);
    }

    return conn.getDb() as T;
  }
}

export function createDatabaseExtension<
  C,
  P,
  TSchema extends Record<string, unknown> = Record<string, never>,
  TRelationConfigs extends AnyRelations = EmptyRelations,
>(config: DatabaseConfig<C, P, TSchema, TRelationConfigs>): ExtensionCreator {
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
