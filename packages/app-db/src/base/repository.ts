import type { Insertable, Kysely, Selectable, TransactionSettings } from "kysely";
import { inject } from "@resolid/app";
import type { Database } from "../core/database";
import type { DatabaseExecutor, DatabaseTransaction } from "../core/types";
import { DatabaseService } from "../core/service";
import { insertOne } from "../helper/insert-one";

export abstract class BaseRepository<DB = Database, Name extends string = string> {
  protected connectionName?: Name;

  private readonly _executor?: DatabaseExecutor<DB, Name>;
  private readonly _databaseService?: DatabaseService;

  constructor(trx: DatabaseExecutor<DB, Name> | DatabaseService = inject(DatabaseService)) {
    if (trx instanceof DatabaseService) {
      this._databaseService = trx;
    } else {
      this._executor = trx;
    }
  }

  protected get db(): Kysely<DB> {
    return this._executor ?? this._databaseService!.get<DB, Name>(this.connectionName);
  }

  protected insertOne<T extends keyof DB & string>(
    table: T,
    values: Insertable<DB[T]>,
  ): Promise<Selectable<DB[T]>> {
    return insertOne(this.db, table, values);
  }

  transaction<T>(
    handler: (repo: this, trx: DatabaseTransaction<DB, Name>) => Promise<T>,
    settings?: TransactionSettings,
  ): Promise<T> {
    if (!this._databaseService) {
      throw new Error("Cannot start a transaction from a repository bound to an executor.");
    }

    const builder = this._databaseService.get<DB, Name>(this.connectionName).transaction();

    const withAccessMode =
      settings?.accessMode === undefined ? builder : builder.setAccessMode(settings.accessMode);
    const withIsolationLevel =
      settings?.isolationLevel === undefined
        ? withAccessMode
        : withAccessMode.setIsolationLevel(settings.isolationLevel);

    return withIsolationLevel.execute((trx) => {
      const transaction = trx as DatabaseTransaction<DB, Name>;
      const repo = this.withExecutor(transaction);

      return handler(repo, transaction);
    });
  }

  withExecutor(trx: DatabaseExecutor<DB, Name>): this {
    const Ctor = this.constructor as new (
      trx: DatabaseExecutor<DB, Name> | DatabaseService,
    ) => this;

    return new Ctor(trx);
  }
}
