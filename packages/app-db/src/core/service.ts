import type { DrizzleConfig } from "drizzle-orm";
import type { AnyRelations, EmptyRelations } from "drizzle-orm/relations";
import { LogService } from "@resolid/app-log";
import { type Emitter, type ExtensionCreator, inject } from "@resolid/core";
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

export class DatabaseService<
  C,
  TSchema extends Record<string, unknown> = Record<string, never>,
  TRelationConfigs extends AnyRelations = EmptyRelations,
> {
  protected readonly config: DatabaseConfig<C, TSchema, TRelationConfigs>;
  protected readonly emitter: Emitter;
  protected readonly logger?: LogService;
  protected readonly connections: Map<
    string,
    C extends Record<string, infer T>
      ? DatabaseConnection<T, TSchema, TRelationConfigs>
      : DatabaseConnection<C, TSchema, TRelationConfigs>
  > = new Map();

  private readonly _defaultSource = "main";

  constructor(
    config: DatabaseConfig<C, TSchema, TRelationConfigs>,
    emitter: Emitter,
    logger: LogService | undefined = inject(LogService, { optional: true }),
  ) {
    this.config = config;
    this.emitter = emitter;
    this.logger = logger;
  }

  async connect(): Promise<void> {
    const connections = (this.config.connections ?? {
      [this._defaultSource]: this.config.connection,
    }) as Record<
      string,
      C extends Record<string, infer T>
        ? DatabaseConnection<T, TSchema, TRelationConfigs>
        : DatabaseConnection<C, TSchema, TRelationConfigs>
    >;

    for (const [key, conn] of Object.entries(connections)) {
      // oxlint-disable-next-line no-await-in-loop
      await conn.connect(this.config.drizzleConfig ?? {});

      this.connections.set(key, conn);
    }
  }

  async dispose(): Promise<void> {
    for (const conn of this.connections.values()) {
      // oxlint-disable-next-line no-await-in-loop
      await conn.close();
    }

    this.connections.clear();
  }

  get<T>(name: string = this._defaultSource) {
    const conn = this.connections.get(name);

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
  return ({ emitter, container }) => ({
    name: "resolid-db-module",
    providers: [
      {
        token: DatabaseService,
        factory() {
          return new DatabaseService(config, emitter);
        },
      },
    ],
    async bootstrap() {
      await container.get(DatabaseService).connect();
    },
  });
}
