import { PostgresDialect, type PostgresDialectConfig } from "kysely";
import { Pool, type PoolOptions } from "pg";
import { DatabaseConnection } from "../core/connection";

export type PostGresConnectionConfig = {
  poolOptions: PoolOptions;
  dialectOptions?: Omit<PostgresDialectConfig, "pool">;
  onPoolCreated?: (pool: Pool) => void;
};

export class PostgresConnection extends DatabaseConnection<PostGresConnectionConfig> {
  protected createDialect(): PostgresDialect {
    const pool = new Pool(this.config.poolOptions);

    this.config.onPoolCreated?.(pool);

    return new PostgresDialect({ pool, ...this.config.dialectOptions });
  }
}
