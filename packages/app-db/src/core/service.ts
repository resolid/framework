import type { AppContext, Emitter, ExtensionCreator } from "@resolid/app";
import type { Kysely } from "kysely";
import type { CommonConfig, DatabaseConnection } from "./connection";
import type { Database } from "./database";
import { type AppDbEvents, createLoggerFactory } from "./utils";

export type DatabaseConfig<
  C extends DatabaseConnection<unknown> | Record<string, DatabaseConnection<unknown>>,
> = (C extends Record<string, DatabaseConnection<unknown>>
  ? {
      connections: C;
      default?: keyof C & string;
      connection?: never;
    }
  : {
      connection: C;
      connections?: never;
      default?: never;
    }) &
  CommonConfig;

declare module "@resolid/app" {
  // oxlint-disable-next-line typescript/no-empty-object-type
  export interface AppEvents extends AppDbEvents {}
}

export class DatabaseService<
  C extends DatabaseConnection<unknown> | Record<string, DatabaseConnection<unknown>> =
    | DatabaseConnection<unknown>
    | Record<string, DatabaseConnection<unknown>>,
> {
  private readonly _emitter: Emitter<AppDbEvents>;
  private readonly _config: DatabaseConfig<C>;
  private readonly _connections: Record<string, DatabaseConnection<unknown>>;
  private readonly _defaultName: string;

  private _inited = false;

  constructor(config: DatabaseConfig<C>, context: AppContext) {
    this._config = config;
    this._emitter = context.emitter;
    this._defaultName = config.connection
      ? "default"
      : (config.default ?? Object.keys(config.connections)[0]!);
    this._connections = config.connection ? { default: config.connection } : config.connections;
  }

  async init(): Promise<void> {
    if (this._inited) {
      return;
    }

    const loggerFactory = createLoggerFactory(this._emitter, this._config.logger);

    for (const [name, connection] of Object.entries(this._connections)) {
      connection.connect({
        logger: loggerFactory(name, connection.logger),
        plugins: this._config.plugins,
      });
    }

    this._inited = true;
  }

  async dispose(): Promise<void> {
    const connections = Object.values(this._connections);

    const results = await Promise.allSettled(connections.map((connection) => connection.close()));

    this._inited = false;

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

  get<DB>(name?: string): Kysely<DB> {
    const key = name ?? this._defaultName;
    const connection = this._connections[key];

    if (!connection) {
      throw new Error(`Connection with name ${key} does not exist.`);
    }

    return connection.database as Kysely<DB>;
  }

  transaction<DB = Database, T = unknown>(
    handler: (executor: Kysely<DB>) => Promise<T>,
    name: string = this._defaultName,
  ): Promise<T> {
    return this.get<DB>(name).transaction().execute(handler);
  }
}

export function createDatabaseExtension<
  C extends DatabaseConnection<unknown> | Record<string, DatabaseConnection<unknown>>,
>(config: DatabaseConfig<C>): ExtensionCreator {
  return (context) => ({
    name: "resolid-db-module",
    providers: [
      {
        token: DatabaseService,
        factory() {
          return new DatabaseService<C>(config, context);
        },
      },
    ],
    async bootstrap() {
      await context.container.get(DatabaseService).init();
    },
  });
}
