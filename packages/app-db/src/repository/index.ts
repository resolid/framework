import { inject } from "@resolid/core";
import { DatabaseService } from "../service";

export abstract class BaseRepository<T> {
  protected readonly source?: string;

  private readonly _database: DatabaseService<T>;

  protected constructor(database: DatabaseService<T> = inject(DatabaseService)) {
    this._database = database;
  }

  protected get db(): T {
    return this._database.get(this.source);
  }
}
