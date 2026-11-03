import type { ReplicaStrategy } from "kysely-replication";
import { MysqlDialect, type MysqlDialectConfig } from "kysely";
import mysql, { type Pool, type PoolOptions } from "mysql2";
import { DatabaseConnection, type ReplicationConfig } from "../core/connection";

export type MySqlPoolConfig = {
  poolOptions: PoolOptions;
  dialectOptions?: Omit<MysqlDialectConfig, "pool">;
};

export type MySqlConnectionConfig = MySqlPoolConfig & {
  onPoolCreated?: (pool: Pool) => void;
  replicas?: MySqlPoolConfig[];
} & ReplicationConfig;

export class MySqlConnection extends DatabaseConnection<MySqlConnectionConfig> {
  protected createDialect(): MysqlDialect {
    return this._createMySqlDialect(this.config);
  }

  protected override createReplicaDialects(): MysqlDialect[] {
    return (this.config.replicas ?? []).map((replica) => this._createMySqlDialect(replica));
  }

  protected override get replicaStrategy(): ReplicaStrategy | undefined {
    return this.config.replicaStrategy;
  }

  private _createMySqlDialect(config: MySqlPoolConfig) {
    const pool = mysql.createPool({
      charsetNumber: mysql.Charsets.UTF8MB4_0900_AI_CI,
      ...config.poolOptions,
    });

    this.config.onPoolCreated?.(pool);

    return new MysqlDialect({ pool, ...config.dialectOptions });
  }
}
