import { BaseRepository, type DatabaseConfig, DatabaseService } from "@resolid/app-db";
import type { Emitter, ExtensionCreator } from "@resolid/core";
import type { Simplify } from "drizzle-orm";
import type { Mode } from "drizzle-orm/mysql-core";
import { drizzle, type MySql2Database, type MySql2DrizzleConfig } from "drizzle-orm/mysql2";
import mysql, { type ConnectionOptions, type Pool } from "mysql2";

export type MySQLDatabaseConfig<S extends Record<string, unknown> = Record<string, never>> = {
  mode?: Mode;
  enhancer?: (pool: Pool) => Pool | void;
} & DatabaseConfig<
  S,
  {
    uri: string;
  } & Simplify<
    Omit<
      ConnectionOptions,
      | "host"
      | "port"
      | "user"
      | "password"
      | "password1"
      | "password2"
      | "password3"
      | "passwordSha1"
      | "database"
      | "uri"
    >
  >
>;

export type MySQLDatabase<S extends Record<string, unknown>> = MySql2Database<S> & { $client: Pool };

class MySQLDatabaseService<S extends Record<string, unknown> = Record<string, never>> extends DatabaseService<
  MySQLDatabase<S>,
  S,
  MySQLDatabaseConfig<S>
> {
  constructor(config: MySQLDatabaseConfig<S>, emitter: Emitter) {
    super(config, emitter);
  }

  override connect(): void {
    const connections = this.config.connections ?? [{ config: this.config.connection, name: undefined }];

    for (const connection of connections) {
      let pool = mysql.createPool(connection.config);

      if (this.config.enhancer) {
        const maybe = this.config.enhancer(pool);

        if (maybe) {
          pool = maybe;
        }
      }

      this.set(
        drizzle(pool, {
          mode: this.config.mode,
          ...this.config.drizzle,
        } as MySql2DrizzleConfig<S>) as MySQLDatabase<S>,
        connection.name,
      );
    }
  }

  override close(): Promise<void> | void {
    for (const conn of this.connections.values()) {
      conn.$client.end();
    }
  }
}

export abstract class Repository extends BaseRepository<MySql2Database> {}

export function createMySQLDatabaseExtension<S extends Record<string, unknown> = Record<string, never>>(
  config: MySQLDatabaseConfig<S>,
): ExtensionCreator {
  return (context) => {
    return {
      name: "resolid-mysql-db-module",
      providers: [
        {
          token: DatabaseService,
          factory() {
            return new MySQLDatabaseService<S>(config, context.emitter);
          },
        },
      ],
      boot(context) {
        context.container.get(DatabaseService).connect();
      },
    };
  };
}
