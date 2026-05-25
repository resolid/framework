import type { DrizzleConfig } from "drizzle-orm";
import type { AnyRelations, EmptyRelations } from "drizzle-orm/relations";

export abstract class DatabaseConnection<
  T,
  TSchema extends Record<string, unknown> = Record<string, never>,
  TRelationConfigs extends AnyRelations = EmptyRelations,
> {
  private _db: T | undefined;

  protected setDb(db: T): void {
    this._db = db;
  }

  getDb() {
    return this._db as T;
  }

  abstract connect(drizzleConfig: DrizzleConfig<TSchema, TRelationConfigs>): Promise<void> | void;
  abstract close(): Promise<void> | void;
}
