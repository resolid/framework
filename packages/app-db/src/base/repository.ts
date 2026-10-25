import type { Insertable, Kysely, Selectable } from "kysely";
import { inject } from "@resolid/app";
import type { Database } from "../core/database";
import type { DatabaseExecutor } from "../core/types";
import { DatabaseService } from "../core/service";
import { insertOne } from "../helper/insert-one";

export abstract class BaseRepository<DB = Database> {
  protected connectionName?: string;

  private readonly _executor?: Kysely<DB>;
  private readonly _databaseService?: DatabaseService;

  constructor(trx: DatabaseExecutor<DB> | DatabaseService = inject(DatabaseService)) {
    if (trx instanceof DatabaseService) {
      this._databaseService = trx;
    } else {
      this._executor = trx;
    }
  }

  protected get db(): Kysely<DB> {
    return this._executor ?? this._databaseService!.get<DB>(this.connectionName);
  }

  protected insertOne<T extends keyof DB & string>(
    table: T,
    values: Insertable<DB[T]>,
  ): Promise<Selectable<DB[T]>> {
    return insertOne(this.db, table, values);
  }

  withExecutor(trx: DatabaseExecutor<DB>): this {
    const Ctor = this.constructor as new (trx: DatabaseExecutor<DB> | DatabaseService) => this;

    return new Ctor(trx);
  }
}
