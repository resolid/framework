import type { AnyRelations, EmptyRelations } from "drizzle-orm/relations";
import {
  type DrizzleMySqlConfig,
  mysqlTableCreator,
  type MySqlTableFn,
} from "drizzle-orm/mysql-core";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql, { type ConnectionOptions, type Pool } from "mysql2";
import { DatabaseConnection, type Enhancer } from "../core/connection";
import { Repository } from "../core/repository";

export type MySqlConfig = ConnectionOptions;

export class MySqlConnection extends DatabaseConnection<MySql2Database, Pool> {
  private readonly _config: MySqlConfig;

  constructor(config: MySqlConfig, enhancer?: Enhancer<Pool> | false) {
    super(enhancer);

    this._config = config;
  }

  override connect(drizzleConfig: DrizzleMySqlConfig<EmptyRelations>): void {
    const pool = this.enhance(
      mysql.createPool({
        charsetNumber: mysql.Charsets.UTF8MB4_0900_AI_CI,
        ...this._config,
      }),
    );

    this.setDb(drizzle({ client: pool, ...drizzleConfig }));
  }

  override close(): void {
    this.getDb().$client.end();
  }
}

export function createMySqlDefineTable(prefix = ""): MySqlTableFn {
  return mysqlTableCreator((name) => prefix + name);
}

export abstract class MySqlRepository extends Repository<MySql2Database, Pool> {}

export type MySqlDatabase<TRelations extends AnyRelations = EmptyRelations> =
  MySql2Database<TRelations>;

export type MySqlClient = Pool;

// oxlint-disable-next-line import/export
export * from "drizzle-orm/mysql-core";
