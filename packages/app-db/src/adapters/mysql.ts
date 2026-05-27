import type { AnyRelations, EmptyRelations } from "drizzle-orm/relations";
import {
  type DrizzleMySqlConfig,
  mysqlTableCreator,
  type MySqlTableFn,
} from "drizzle-orm/mysql-core";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql, { type ConnectionOptions, type Pool } from "mysql2";
import { DatabaseConnection } from "../core/connection";
import { Repository } from "../core/repository";

type Enhancer = (pool: Pool) => Pool | void;

export type MySqlConfig = ConnectionOptions;

export class MySqlConnection extends DatabaseConnection<
  MySql2Database & {
    $client: Pool;
  }
> {
  private readonly _config: MySqlConfig;
  private readonly _enhancer: Enhancer | false | undefined;

  constructor(config: MySqlConfig, enhancer?: Enhancer | false) {
    super();

    this._config = config;
    this._enhancer = enhancer;
  }

  override connect(drizzleConfig: DrizzleMySqlConfig<EmptyRelations>): void {
    let pool = mysql.createPool({
      charsetNumber: mysql.Charsets.UTF8MB4_0900_AI_CI,
      ...this._config,
    });

    if (this._enhancer) {
      const maybe = this._enhancer(pool);

      if (maybe) {
        pool = maybe;
      }
    }

    this.setDb(drizzle({ client: pool, ...drizzleConfig }));
  }

  override close(): void {
    this.getDb().$client.end();
  }
}

export function createMySqlDefineTable(prefix = ""): MySqlTableFn {
  return mysqlTableCreator((name) => prefix + name);
}

export abstract class MySqlRepository extends Repository<MySql2Database> {}

export type MySqlDatabase<TRelations extends AnyRelations = EmptyRelations> =
  MySql2Database<TRelations>;

// oxlint-disable-next-line import/export
export * from "drizzle-orm/mysql-core";
