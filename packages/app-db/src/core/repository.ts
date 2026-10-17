import { inject } from "@resolid/app";
import { DatabaseService } from "./service";

export abstract class Repository<T, P> {
  protected readonly source?: string;

  private readonly _database: DatabaseService<T, P>;

  constructor(database: DatabaseService<T, P> = inject(DatabaseService)) {
    this._database = database;
  }

  protected get db(): T {
    return this._database.get<T>(this.source);
  }
}
