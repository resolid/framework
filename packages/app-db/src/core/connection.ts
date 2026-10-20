import { type Dialect, Kysely, type KyselyPlugin, type Logger } from "kysely";
import { TablePrefixPlugin } from "../plugins/table-prefix-plugin";
import { TableSnakeCasePlugin } from "../plugins/table-snake-case-plugin";

export type CommonConfig = {
  logger?: boolean | Logger;
  plugins?: KyselyPlugin[];
  tablePrefix?: string;
  /**
   * Yii-style physical table naming: camelCase (or PascalCase) schema keys are
   * compiled to snake_case table names. Enabled by default; set to false to
   * keep schema keys verbatim.
   */
  snakeCaseTables?: boolean;
};

export type ConnectionConfig<C> = C & CommonConfig;

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

  connect(options: { logger?: Logger; plugins?: KyselyPlugin[] }): void {
    this._database = new Kysely({
      dialect: this.createDialect(),
      plugins: [
        ...(options.plugins ?? []),
        ...(this.config.plugins ?? []),
        ...(this.config.snakeCaseTables === false ? [] : [new TableSnakeCasePlugin()]),
        ...(this.config.tablePrefix ? [new TablePrefixPlugin(this.config.tablePrefix)] : []),
      ],
      log: options.logger,
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
