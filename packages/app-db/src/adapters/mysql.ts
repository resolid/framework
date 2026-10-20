import { MysqlDialect, type MysqlDialectConfig } from "kysely";
import mysql, { type Pool, type PoolOptions } from "mysql2";
import { DatabaseConnection } from "../core/connection";

export type MySqlConnectionConfig = {
  poolOptions: PoolOptions;
  dialectOptions?: Omit<MysqlDialectConfig, "pool">;
  onPoolCreated?: (pool: Pool) => void;
};

export class MySqlConnection extends DatabaseConnection<MySqlConnectionConfig> {
  protected createDialect(): MysqlDialect {
    const pool = mysql.createPool({
      charsetNumber: mysql.Charsets.UTF8MB4_0900_AI_CI,
      ...this.config.poolOptions,
    });

    this.config.onPoolCreated?.(pool);

    return new MysqlDialect({ pool, ...this.config.dialectOptions });
  }
}
