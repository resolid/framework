import { type Dialect, Kysely, type KyselyPlugin, type Logger } from "kysely";
import { TablePrefixPlugin } from "../plugins/table-prefix-plugin";
import { TableSnakeCasePlugin } from "../plugins/table-snake-case-plugin";

export type CommonConfig = {
  logger?: boolean | Logger;
  plugins?: KyselyPlugin[];
};

export type ConnectionConfig<C> = C &
  CommonConfig & {
    tablePrefix?: string;
    snakeCaseTables?: boolean;
  };

export abstract class DatabaseConnection<C> {
  protected readonly config: ConnectionConfig<C>;
  private _database: Kysely<unknown> | undefined;

  constructor(config: ConnectionConfig<C>) {
    this.config = config;
  }

  get database(): Kysely<unknown> {
    if (!this._database) {
      throw new Error("Database connection has not been initialized, call connect() first.");
    }

    return this._database;
  }

  get logger(): boolean | Logger | undefined {
    return this.config.logger;
  }

  protected abstract createDialect(): Dialect;

  connect(context: { logger?: Logger; plugins?: KyselyPlugin[] }): void {
    this._database = new Kysely({
      dialect: this.createDialect(),
      plugins: [
        ...(context.plugins ?? []),
        ...(this.config.plugins ?? []),
        ...(this.config.snakeCaseTables === false ? [] : [new TableSnakeCasePlugin()]),
        ...(this.config.tablePrefix ? [new TablePrefixPlugin(this.config.tablePrefix)] : []),
      ],
      log: context.logger,
    });
  }

  async close(): Promise<void> {
    if (!this._database) {
      return;
    }

    await this._database.destroy();
    this._database = undefined;
  }
}
