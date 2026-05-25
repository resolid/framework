import { inject } from "@resolid/core";
import { DatabaseService } from "./service";

export abstract class Repository<T> {
  protected readonly source?: string;

  private readonly _database: DatabaseService<T>;

  constructor(database: DatabaseService<T> = inject(DatabaseService)) {
    this._database = database;
  }

  protected get db(): T {
    return this._database.get<T>(this.source);
  }
}
