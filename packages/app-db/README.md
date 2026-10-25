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
        tablePrefix: env.RX_DB_TABLE_PREFIX,
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

- `tablePrefix` — runtime table prefix (see [Table names](#table-names)); unset or empty means no plugin
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

`column<T>()` is type-only: it records the column type for inference and has no runtime value. `defineTable` uses only the column keys, so it does not generate migrations, defaults or constraints — those stay in your schema/migration tooling. `name` is the table name used in queries; when a query uses it, the snake-case and prefix plugins rewrite the identifier to the physical name. The key in the `Database` augmentation is a separate, type-level key: Kysely types queries by that key, while the plugins rewrite whatever identifier the query uses. Keeping the key and `name` identical avoids two different physical names for the same table.

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

Physical table names derive from the table identifier used in the query (normally the `Database` key, or the `defineTable` name when a repository queries by it): `snakeCaseTables` (enabled by default) names tables after the word-segmented camelCase names (`userOrders` → `user_orders`, `HTTPServer` → `http_server`, `SERVER2` → `server_2`), and an optional `tablePrefix` is prepended to each final name (`status` → `rx_status`). Set `snakeCaseTables: false` to keep identifiers verbatim.

## Repositories and services

Extend `BaseRepository` for data access and `BaseService` for business logic:

```ts
import { BaseRepository } from "@resolid/app-db";

export class SystemRepository extends BaseRepository {
  async getFirst(): Promise<Status | undefined> {
    return this.db.selectFrom("status").selectAll().limit(1).executeTakeFirst();
  }
}
```

`BaseRepository` exposes `this.db` — a fully typed Kysely instance. `BaseRepository<DB>` takes the database schema as its type parameter and defaults to the shared `Database` interface, so a repository bound to another schema can be written explicitly.

`BaseService` exposes `this.database`, the injected `DatabaseService`, with `get<DB>(name)` for a typed Kysely instance and `transaction(handler, name)` for transactions. It has no schema type parameter.

Both classes resolve `DatabaseService` through DI, so constructing them without arguments only works while a provider or extension factory is running. If you create one later by hand, pass the `DatabaseService` or a transaction executor explicitly.

### Transactions

`BaseRepository` uses the pooled connection of the injected `DatabaseService`. To group writes, start a transaction from a service and give the executor to the repositories that should run inside it:

```ts
import { BaseRepository, BaseService, type Database } from "@resolid/app-db";

class OrderRepository extends BaseRepository {
  create(input: NewOrder) {
    return this.db.insertInto("order").values(input).executeTakeFirstOrThrow();
  }
}

class PaymentRepository extends BaseRepository {
  create(orderId: number) {
    return this.db.insertInto("payment").values({ orderId }).execute();
  }
}

export class OrderService extends BaseService {
  placeOrder(input: NewOrder) {
    return this.database.transaction<Database>(async (trx) => {
      const orders = new OrderRepository(trx);
      const payments = new PaymentRepository(trx);

      const order = await orders.create(input);
      await payments.create(order.id);

      return order;
    });
  }
}
```

The Kysely transaction is itself a database executor (`DatabaseExecutor<DB>` is `Kysely<DB> | Transaction<DB>`), so `new OrderRepository(trx)` makes every query in that repository use the transaction. Repositories constructed without an executor keep using the pool. The second argument of `transaction` selects the connection name and defaults to the default connection.

If a service already holds a repository instance, call `withExecutor(trx)` to get a new instance of the same repository bound to the transaction instead of constructing one:

```ts
return this.database.transaction(async (trx) => {
  const orders = this.orders.withExecutor(trx);

  // ...
});
```

`withExecutor` constructs the repository with the executor as its only argument, so a repository with other constructor dependencies has to accept them as optional or be rebuilt explicitly.

The executor is a local callback argument, so a singleton service can run concurrent transactions safely; each call gets its own executor. Keep the repositories created for a transaction inside that callback.

## Inserting rows

Databases disagree on how to return a row after `insert`. `insertOne` hides the difference and returns the inserted row on MySQL, PostgreSQL and SQLite:

```ts
import { insertOne } from "@resolid/app-db";

const status = await insertOne(db, "status", { message: "ok" });
```

- PostgreSQL and SQLite use `returning` and read the row in one statement.
- Dialects with `output` support (such as SQL Server) use `output inserted`.
- MySQL (and any dialect without either) takes `insertId` from the result and selects the row by primary key; when there is no auto-increment id, the value from `values[pk]` is used.

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
