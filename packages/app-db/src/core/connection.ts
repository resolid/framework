import { type Dialect, Kysely, type KyselyPlugin, type Logger } from "kysely";
import { KyselyReplicationDialect, type ReplicaStrategy } from "kysely-replication";
import { RoundRobinReplicaStrategy } from "kysely-replication/strategy/round-robin";
import { TablePrefixPlugin } from "../plugins/table-prefix-plugin";
import { TableSnakeCasePlugin } from "../plugins/table-snake-case-plugin";

export type ReplicationConfig = {
  /** 默认 RoundRobinReplicaStrategy({ onTransaction: "error" }) */
  replicaStrategy?: ReplicaStrategy;
};

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

  protected get replicaStrategy(): ReplicaStrategy | undefined {
    return undefined;
  }

  protected abstract createDialect(): Dialect;

  protected createReplicaDialects(): Dialect[] {
    return [];
  }

  connect(context: { logger?: Logger; plugins?: KyselyPlugin[] }): void {
    this._database = new Kysely({
      dialect: this._createConfiguredDialect(),
      plugins: [
        ...(context.plugins ?? []),
        ...(this.config.plugins ?? []),
        ...(this.config.snakeCaseTables === false ? [] : [new TableSnakeCasePlugin()]),
        ...(this.config.tablePrefix ? [new TablePrefixPlugin(this.config.tablePrefix)] : []),
      ],
      log: context.logger,
    });
  }

  private _createConfiguredDialect() {
    const primaryDialect = this.createDialect();
    const [firstReplica, ...otherReplicas] = this.createReplicaDialects();

    if (!firstReplica) {
      return primaryDialect;
    }

    return new KyselyReplicationDialect({
      primaryDialect,
      replicaDialects: [firstReplica, ...otherReplicas],
      replicaStrategy:
        this.replicaStrategy ?? new RoundRobinReplicaStrategy({ onTransaction: "error" }),
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
