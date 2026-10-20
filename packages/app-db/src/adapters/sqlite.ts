import Database from "better-sqlite3";
import { SqliteDialect, type SqliteDialectConfig } from "kysely";
import { DatabaseConnection } from "../core/connection";

export type SqliteConnectionConfig = {
  databaseFile: string;
  databaseOptions?: Database.Options;
  dialectOptions?: Omit<SqliteDialectConfig, "database">;
};

export class SqliteConnection extends DatabaseConnection<SqliteConnectionConfig> {
  protected createDialect(): SqliteDialect {
    const database = new Database(this.config.databaseFile, this.config.databaseOptions);

    return new SqliteDialect({ database, ...this.config.dialectOptions });
  }
}
