# Database module for Resolid applications

![GitHub License](https://img.shields.io/github/license/resolid/framework)
![NPM Version](https://img.shields.io/npm/v/%40resolid/app-db)

<b>[Documentation](https://www.resolid.tech/docs/database)</b> | [Framework Bundle](https://github.com/resolid/framework)

Database support for Resolid applications, built on [Kysely](https://kysely.dev). It wires Kysely into the app lifecycle (extension, service, dispose), provides adapters for MySQL, PostgreSQL and SQLite, and keeps query builders type-safe through a mergeable `Database` schema interface. It also ships small helpers for defining tables (`defineTable`/`column`), filtering incoming data down to the table's columns, and inserting a row and returning it across dialects (`insertOne`). Query building and SQL generation stay pure Kysely — this package adds the shell around it.

## Installation

```shell
pnpm add @resolid/app-db kysely
```

The database driver is an optional peer dependency — install only the one(s) you use:

| Adapter                             | Driver                                                         | Install                   |
| ----------------------------------- | -------------------------------------------------------------- | ------------------------- |
| `@resolid/app-db/adapters/mysql`    | [mysql2](https://www.npmjs.com/package/mysql2)                 | `pnpm add mysql2`         |
| `@resolid/app-db/adapters/postgres` | [pg](https://www.npmjs.com/package/pg)                         | `pnpm add pg`             |
| `@resolid/app-db/adapters/sqlite`   | [better-sqlite3](https://www.npmjs.com/package/better-sqlite3) | `pnpm add better-sqlite3` |

## Configuration

Register the database extension with a connection adapter:

```ts
import { createApp, loadProviders } from "@resolid/app";
import { createDatabaseExtension } from "@resolid/app-db";
import { MySqlConnection } from "@resolid/app-db/adapters/mysql";

export const app = await createApp({
  name: "Resolid",
  extensions: [
    createDatabaseExtension({
      connection: new MySqlConnection({
        tableName: { prefix: env.RX_DB_TABLE_PREFIX },
        poolOptions: { uri: env.RX_DB_URI },
      }),
      logger: __DEV__,
    }),
  ],
  providers: loadProviders(
    Object.values(import.meta.glob("./**/repository.server.ts", { import: "*", eager: true })),
  ),
});
```

Connection options shared by every adapter:

- `tableName` — physical table naming (see [Table names](#table-names)): `snakeCase` is enabled by default, `prefix` is applied when non-empty
- `plugins` — extra [Kysely plugins](https://kysely.dev/docs/categories/Plugins), e.g. `CamelCasePlugin`
- `logger` — `true` to also print queries to the console, or a custom Kysely `Logger`

Adapters add their own driver options (`poolOptions` for `mysql2`/`pg`, `databaseFile`/`databaseOptions` for `better-sqlite3`, plus `onPoolCreated` hook and `dialectOptions` passthrough on the pool-based ones).

### Multiple connections

Pass `connections` instead of `connection` to name more than one database. A single `connection` is registered under the name `default`; with `connections`, the default is the first key unless `default` names another one:

```ts
createDatabaseExtension({
  connections: {
    main: new MySqlConnection({ poolOptions: { uri: env.RX_DB_URI } }),
    analytics: new PostgresConnection({ poolOptions: { connectionString: env.RX_DW_URI } }),
  },
  default: "analytics",
});
```

Repositories select a named connection via their protected `connectionName` property; services pass the name to `this.database.get(name)` or `this.database.transaction(handler, name)`. Both fall back to the default connection.

### Read replicas

PostgreSQL and MySQL connections can send reads to replicas. Pass `replicas` next to `poolOptions`; each replica takes its own `poolOptions` and `dialectOptions`:

```ts
createDatabaseExtension({
  connection: new PostgresConnection({
    poolOptions: { connectionString: env.RX_DB_URI },
    replicas: [
      { poolOptions: { connectionString: env.RX_DB_REPLICA_1_URI } },
      { poolOptions: { connectionString: env.RX_DB_REPLICA_2_URI } },
    ],
    onPoolCreated: (pool) => pool.on("error", (error) => logger.error(error)),
  }),
});
```

`onPoolCreated` is connection-level: it runs for the primary pool and for every replica pool, so error handlers and pool metrics only need to be registered once. `replicaStrategy` controls which replica serves a read and defaults to `new RoundRobinReplicaStrategy({ onTransaction: "error" })`. A custom strategy is an object with `next(replicaCount): Promise<number>` and an optional `onTransaction` setting:

```ts
import type { ReplicaStrategy } from "@resolid/app-db";

const strategy: ReplicaStrategy = {
  next: async (replicaCount) => Math.floor(Math.random() * replicaCount),
  onTransaction: "error",
};
```

Routing:

- `select` without a lock, and `stream` — replica
- `insert`, `update`, `delete`, `merge`, DDL, raw statements executed with Kysely's `sql` template, and transactions — primary

Reads are eventually consistent: a row written on the primary may not be visible on a replica yet. To read after a write, force the primary for that query. The `withPrimary()`/`withReplica()` helpers are opt-in, because they patch the Kysely prototypes; import the separate entry once in your app:

```ts
import "@resolid/app-db/replication";

await db.withPrimary().selectFrom("order").selectAll().execute();
await db.withReplica(1).selectFrom("order").selectAll().execute();
```

`insertOne` already reads its fallback row back from the primary, so the insert-then-select path on MySQL is not affected by replication lag.

Row locks are not routed automatically: `.forUpdate()` / `.forShare()` stay `select` queries and therefore still use a replica. Run them with `withPrimary()` (or inside a transaction, which always uses the primary) when you need the lock on the primary.

SQLite has a single file and does not support `replicas`; passing it is a type error.

## Defining tables

Every module (and every published package) owns its table types and merges them into the shared `Database` interface with `declare module` augmentation:

```ts
import type { Generated, Insertable, Selectable } from "kysely";

export interface StatusTable {
  id: Generated<number>;
  message: string;
}

declare module "@resolid/app-db" {
  interface Database {
    status: StatusTable;
  }
}

export type Status = Selectable<StatusTable>;
export type NewStatus = Insertable<StatusTable>;
```

There is no central registration file: as long as the augmenting file is part of the compilation, `Database` automatically includes every declared table. Colliding table keys or incompatible types fail at compile time instead of silently overwriting.

### Table definitions

Writing the interface by hand works, but shared column sets and the derived types are easier with `defineTable` and `column`:

```ts
import { column, defineTable, type Generated, type Timestamp } from "@resolid/app-db";

export const statusColumns = {
  id: column<Generated<number>>(),
  message: column<string>(),
  createdAt: column<Generated<Timestamp>>(),
  updatedAt: column<Timestamp | null>(),
};

export const statusTable = defineTable("status", statusColumns);

export type Status = typeof statusTable.$select;
export type NewStatus = typeof statusTable.$insert;
export type StatusUpdate = typeof statusTable.$update;

declare module "@resolid/app-db" {
  interface Database {
    status: typeof statusTable.$infer;
  }
}
```

`defineTable(name, columns)` returns the definition:

| Member             | Description                                                |
| ------------------ | ---------------------------------------------------------- |
| `name`             | table name used in queries (before the naming plugins)     |
| `$infer`           | the plain column interface, `InferTable<typeof columns>`   |
| `$select`          | row shape returned by a query (`Selectable`)               |
| `$insert`          | accepted insert values (`Insertable`)                      |
| `$update`          | accepted update values (`Updateable`)                      |
| `filterData(data)` | shallow copy of `data` containing only the table's columns |

`column<T>()` is type-only: it records the column type for inference and has no runtime value. `defineTable` uses only the column keys, so it does not generate migrations, defaults or constraints — those stay in your schema/migration tooling. `name` is the table name used in queries; when a query uses it, the table-name plugin rewrites the identifier to the physical name. The key in the `Database` augmentation is a separate, type-level key: Kysely types queries by that key, while the plugins rewrite whatever identifier the query uses. Keeping the key and `name` identical avoids two different physical names for the same table.

Shared column sets are plain objects, so they can be spread into several tables and reused. `InferTable` gives the column interface on its own:

```ts
import { column, type Generated, type InferTable, type Timestamp } from "@resolid/app-db";

export const authColumns = {
  id: column<Generated<number>>(),
  email: column<Generated<string>>(),
  createdAt: column<Generated<Timestamp>>(),
};

export type AuthTable = InferTable<typeof authColumns>;
```

### Filtering insert data

Form data often carries fields the table does not have (`agreeTerms`, `captcha`, a password confirmation). `filterData` narrows such an object to the table's columns, at runtime and in the type, so it can be inserted without casts or picking fields by hand:

```ts
const values = statusTable.filterData(formData);
// type: only the keys defined on statusTable

await db.insertInto("status").values(values).execute();
```

The filter is shallow: a value that belongs to a column is kept as-is, so a nested object is not filtered further. Columns missing from `data` are not added, which leaves database defaults in charge.

### Timestamps

`Timestamp` is a ready-made column type for timestamp columns — `ColumnType<Date, Date | string, Date | string>` — so selects return `Date` while inserts and updates accept a `Date` or a string:

```ts
import type { Timestamp } from "@resolid/app-db";
import type { Generated } from "kysely";

export interface StatusTable {
  id: Generated<number>;
  message: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp | null;
}
```

### Table names

Physical table names derive from the table identifier used in the query (normally the `Database` key, or the `defineTable` name when a repository queries by it). The `tableName` connection option controls both rewrites:

- `snakeCase` (enabled by default) names tables after the word-segmented camelCase names (`userOrders` → `user_orders`, `HTTPServer` → `http_server`, `SERVER2` → `server_2`). Set it to `false` to keep identifiers verbatim.
- `prefix` prepends a string to each final name when non-empty (`status` → `rx_status`). Omit it or leave it empty to disable prefixing.

```ts
new MySqlConnection({
  tableName: { snakeCase: true, prefix: "rx_" },
  poolOptions: { uri: env.RX_DB_URI },
});
```

## Repositories

Extend `BaseRepository` for data access:

```ts
import { BaseRepository } from "@resolid/app-db";

export class SystemRepository extends BaseRepository {
  async getFirst(): Promise<Status | undefined> {
    return this.db.selectFrom("status").selectAll().limit(1).executeTakeFirst();
  }
}
```

`BaseRepository` exposes `this.db` — a fully typed Kysely instance. `BaseRepository<DB, Name>` takes the database schema and an optional connection name as its type parameters; `DB` defaults to the shared `Database` interface, and `Name` defaults to `string` (unchecked).

`BaseRepository` resolves `DatabaseService` through DI, so constructing it without arguments only works while a provider or extension factory is running. If you create one later by hand, pass the `DatabaseService` or a transaction executor explicitly.

### Transactions

Start transactions from the repository that owns the connection. `transaction()` uses the repository's connection and accepts Kysely transaction settings:

```ts
import { BaseRepository, type Database } from "@resolid/app-db";

class OrderRepository extends BaseRepository<Database, "main"> {
  protected override connectionName = "main" as const;

  create(input: NewOrder) {
    return this.db.insertInto("order").values(input).executeTakeFirstOrThrow();
  }
}

class PaymentRepository extends BaseRepository<Database, "main"> {
  protected override connectionName = "main" as const;

  create(orderId: number) {
    return this.db.insertInto("payment").values({ orderId }).execute();
  }
}

const orders = new OrderRepository(databaseService);

await orders.transaction(
  async (repo, trx) => {
    const order = await repo.create(input);
    await new PaymentRepository(trx).create(order.id);

    return order;
  },
  { isolationLevel: "repeatable read", accessMode: "read write" },
);
```

The handler's first argument, `repo`, is the repository bound to the transaction; the second argument is the raw Kysely `trx` for repositories that are not passed through the helper. The Kysely transaction is itself a database executor (`DatabaseExecutor<DB>` is `Kysely<DB> | Transaction<DB>`), so `new PaymentRepository(trx)` makes every query in that repository use the transaction. Repositories constructed without an executor keep using the pool.

The transaction executor carries the same connection name, so TypeScript rejects a repository from another connection:

```ts
class AnalyticsRepository extends BaseRepository<Database, "analytics"> {
  protected override connectionName = "analytics" as const;
}

await orders.transaction(async (_orders, trx) => {
  new AnalyticsRepository(trx); // type error: "main" is not assignable to "analytics"
});
```

The check also applies to `withExecutor`. Repositories that leave `Name` at its `string` default are unchecked and accept any executor, which keeps existing code compatible. A repository constructed from an executor cannot start another transaction; use the original repository instead.

The settings map to Kysely's `setAccessMode` / `setIsolationLevel`; the database must support them (PostgreSQL and MySQL do, SQLite ignores them).

The handler's first argument is already the transaction-bound repository. `withExecutor(trx)` remains available when you need to bind a repository to an executor manually:

```ts
const scoped = this.orders.withExecutor(trx);
```

`withExecutor` constructs the repository with the executor as its only argument, so a repository with other constructor dependencies has to accept them as optional or be rebuilt explicitly.

The executor is a local callback argument, so a singleton repository can run concurrent transactions safely; each call gets its own executor. Keep the repositories created for a transaction inside that callback.

## Inserting rows

Databases disagree on how to return a row after `insert`. `insertOne` hides the difference and returns the inserted row on MySQL, PostgreSQL and SQLite:

```ts
import { insertOne } from "@resolid/app-db";

const status = await insertOne(db, "status", { message: "ok" });
```

- PostgreSQL and SQLite use `returning` and read the row in one statement.
- Dialects with `output` support (such as SQL Server) use `output inserted`.
- MySQL (and any dialect without either) takes `insertId` from the result and selects the row by primary key; when there is no auto-increment id, the value from `values[pk]` is used. That read-back is forced to the primary connection, so it is not affected by replica lag.

The primary key defaults to `id`; pass a fourth argument for another name:

```ts
const session = await insertOne(db, "session", { token: "..." }, "token");
```

`BaseRepository` exposes the same helper as a protected method, typed against the repository's schema:

```ts
class StatusRepository extends BaseRepository {
  create(input: NewStatus) {
    return this.insertOne("status", statusTable.filterData(input));
  }
}
```

`insertOne` inserts the values it is given; it does not filter them. Use `filterData` (or pick the fields) when the source object may carry extra keys. The helper throws if the inserted row cannot be read back. The protected repository method always uses `id` as the primary key — call the standalone `insertOne` for a different one.

## Query logging

All queries flow through a shared logger factory, so every connection emits app events regardless of the console `logger` setting:

- `db:query` — `(name: string, sql: string, durationMs: number)` per executed query
- `db:error` — `(name: string, message: string)` per failed query, where `name` is the connection name (`default` for a single connection)

Listen with the standard app emitter:

```ts
app.emitter.on("db:query", (name, sql, durationMs) => {
  app.$.logger.category("db").debug(`${name}: ${sql} (${durationMs}ms)`);
});
```

## Acknowledgment

- [Kysely](https://github.com/kysely-org/kysely)

## License

MIT License (MIT). Please see [LICENSE](./LICENSE) for more information.
