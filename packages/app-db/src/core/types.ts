import type { ColumnType, Kysely, Transaction } from "kysely";

export type Generated<T> =
  T extends ColumnType<infer S, infer I, infer U>
    ? ColumnType<S, I | undefined, U>
    : ColumnType<T, T | undefined, T>;

export type Timestamp = ColumnType<Date, Date | string, Date | string>;

declare const connectionName: unique symbol;

export type ConnectionScope<Name extends string> = string extends Name
  ? { readonly [connectionName]?: Name }
  : { readonly [connectionName]: Name };

export type DatabaseTransaction<DB, Name extends string = string> = Transaction<DB> &
  ConnectionScope<Name>;

export type DatabaseExecutor<DB, Name extends string = string> =
  | (Kysely<DB> & ConnectionScope<Name>)
  | DatabaseTransaction<DB, Name>;
