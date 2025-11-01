import { inject } from "@resolid/core";
import { DatabaseService } from "../service";

export abstract class BaseRepository<T> {
  protected readonly source?: string;

  private readonly database: DatabaseService<T>;

  constructor(database: DatabaseService<T> = inject(DatabaseService)) {
    this.database = database;
  }

  protected get db(): T {
    return this.database.get(this.source);
  }
}
