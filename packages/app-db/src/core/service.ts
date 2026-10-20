import type { AppContext, Emitter, ExtensionCreator } from "@resolid/app";
import type { Kysely } from "kysely";
import type { CommonConfig, DatabaseConnection } from "./connection";
import { type AppDbEvents, createLoggerFactory } from "./utils";

export type DatabaseConfig = {
  connection?: DatabaseConnection<unknown>;
  connections?: Record<string, DatabaseConnection<unknown>>;
} & CommonConfig;

declare module "@resolid/app" {
  // oxlint-disable-next-line typescript/no-empty-object-type
  export interface AppEvents extends AppDbEvents {}
}

export class DatabaseService {
  private readonly _emitter: Emitter<AppDbEvents>;
  private readonly _config: DatabaseConfig;
  private readonly _connections: Map<string, DatabaseConnection<unknown>> = new Map();
  private readonly _defaultSource = "main";

  private _started = false;

  constructor(config: DatabaseConfig, context: AppContext) {
    this._config = config;
    this._emitter = context.emitter;
  }

  async start(): Promise<void> {
    if (this._started) {
      return;
    }

    const connections = this._config.connections ?? {
      [this._defaultSource]: this._config.connection,
    };

    const loggerFactory = createLoggerFactory(this._emitter, this._config.logger);

    for (const [name, conn] of Object.entries(connections)) {
      if (!conn) {
        continue;
      }

      conn.connect({ logger: loggerFactory(name, conn.logger), plugins: this._config.plugins });
      this._connections.set(name, conn);
    }

    this._started = true;
  }

  async dispose(): Promise<void> {
    const connections = [...this._connections.values()];

    this._connections.clear();
    this._started = false;

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

  get<DB>(source: string = this._defaultSource): Kysely<DB> {
    const conn = this._connections.get(source);

    if (!conn) {
      throw new Error(`Connection with name ${source} does not exist.`);
    }

    return conn.database as Kysely<DB>;
  }
}

export function createDatabaseExtension(config: DatabaseConfig): ExtensionCreator {
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
      await context.container.get(DatabaseService).start();
    },
  });
}
