import type { EmptyRelations, AnyRelations } from "drizzle-orm/relations";
import { type NodePgDatabase, drizzle } from "drizzle-orm/node-postgres";
import { type DrizzlePgConfig, type PgTableFn, pgTableCreator } from "drizzle-orm/pg-core";
import { Pool, type PoolConfig } from "pg";
import { DatabaseConnection, type Enhancer } from "../core/connection";
import { Repository } from "../core/repository";

export type PostgresConfig = PoolConfig;

export class PostgresConnection extends DatabaseConnection<NodePgDatabase, Pool> {
  private readonly _config: PostgresConfig;

  constructor(config: PostgresConfig, enhancer?: Enhancer<Pool> | false) {
    super(enhancer);

    this._config = config;
  }

  override connect(drizzleConfig: DrizzlePgConfig<EmptyRelations>): void {
    const pool = this.enhance(
      new Pool({
        ...this._config,
      }),
    );

    this.setDb(drizzle({ client: pool, ...drizzleConfig }));
  }

  override async close(): Promise<void> {
    if (this.connected) {
      await this.getDb().$client.end();
    }
  }
}

export function createPostgresDefineTable(prefix = ""): PgTableFn {
  return pgTableCreator((name) => prefix + name);
}

export abstract class PostgresRepository extends Repository<NodePgDatabase> {}

export type PostgresDatabase<TRelations extends AnyRelations = EmptyRelations> =
  NodePgDatabase<TRelations>;

export type PostgresClient = Pool;

// oxlint-disable-next-line import/export
export * from "drizzle-orm/pg-core";
