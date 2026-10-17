import type { DrizzleConfig } from "drizzle-orm";
import type { AnyRelations, EmptyRelations } from "drizzle-orm/relations";

export type Enhancer<P> = (pool: P) => P | void;
export type DbConn<D, P> = D & { $client: P };

export abstract class DatabaseConnection<
  D,
  P,
  TSchema extends Record<string, unknown> = Record<string, never>,
  TRelationConfigs extends AnyRelations = EmptyRelations,
> {
  private _db: DbConn<D, P> | undefined;
  private readonly _enhancer: Enhancer<P> | false | undefined;

  constructor(enhancer?: Enhancer<P> | false) {
    this._enhancer = enhancer;
  }

  protected enhance(pool: P): P {
    if (this._enhancer) {
      const maybe = this._enhancer(pool);

      if (maybe) {
        return maybe;
      }
    }

    return pool;
  }

  protected setDb(db: DbConn<D, P>): void {
    this._db = db;
  }

  getDb() {
    return this._db as DbConn<D, P>;
  }

  abstract connect(drizzleConfig: DrizzleConfig<TSchema, TRelationConfigs>): Promise<void> | void;
  abstract close(): Promise<void> | void;
}
