import type { ReplicaStrategy } from "kysely-replication";
import { PostgresDialect, type PostgresDialectConfig } from "kysely";
import { Pool, type PoolOptions } from "pg";
import { DatabaseConnection, type ReplicationConfig } from "../core/connection";

export type PostgresPoolConfig = {
  poolOptions: PoolOptions;
  dialectOptions?: Omit<PostgresDialectConfig, "pool">;
};

export type PostgresConnectionConfig = PostgresPoolConfig & {
  onPoolCreated?: (pool: Pool) => void;
  replicas?: PostgresPoolConfig[];
} & ReplicationConfig;

export class PostgresConnection extends DatabaseConnection<PostgresConnectionConfig> {
  protected createDialect(): PostgresDialect {
    return this._createPostgresDialect(this.config);
  }

  protected override createReplicaDialects(): PostgresDialect[] {
    return (this.config.replicas ?? []).map((replica) => this._createPostgresDialect(replica));
  }

  protected override get replicaStrategy(): ReplicaStrategy | undefined {
    return this.config.replicaStrategy;
  }

  private _createPostgresDialect(config: PostgresPoolConfig) {
    const pool = new Pool(config.poolOptions);

    this.config.onPoolCreated?.(pool);

    return new PostgresDialect({ pool, ...config.dialectOptions });
  }
}
