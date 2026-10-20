# Database module for Resolid applications

![GitHub License](https://img.shields.io/github/license/resolid/framework)
![NPM Version](https://img.shields.io/npm/v/%40resolid/app-db)

<b>[Documentation](https://www.resolid.tech/docs/database)</b> | [Framework Bundle](https://github.com/resolid/framework)

Database support for Resolid applications, built on [Kysely](https://kysely.dev). It wires Kysely into the app lifecycle (extension, service, dispose), provides adapters for MySQL, PostgreSQL and SQLite, and keeps query builders type-safe through a mergeable `Database` schema interface. Query building and SQL generation stay pure Kysely — this package adds the shell around it.

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

- `tablePrefix` — runtime table prefix (see [Table prefix](#table-prefix)); unset or empty means no plugin
- `plugins` — extra [Kysely plugins](https://kysely.dev/docs/categories/Plugins), e.g. `CamelCasePlugin`
- `logger` — `true` to also print queries to the console, or a custom Kysely `Logger`

Adapters add their own driver options (`poolOptions` for `mysql2`/`pg`, `databaseFile`/`databaseOptions` for `better-sqlite3`, plus `onPoolCreated` hook and `dialectOptions` passthrough on the pool-based ones).

### Multiple connections

Pass `connections` instead of `connection` to name more than one database:

```ts
createDatabaseExtension({
  connections: {
    main: new MySqlConnection({ poolOptions: { uri: env.RX_DB_URI } }),
    analytics: new PostgresConnection({ poolOptions: { connectionString: env.RX_DW_URI } }),
  },
});
```

Repositories select a named connection via their protected `source` property (defaults to `main`).

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

Physical table names derive from the schema keys: `snakeCaseTables` (enabled by default) names tables after the word-segmented camelCase keys (`userOrders` → `user_orders`, `HTTPServer` → `http_server`, `SERVER2` → `server_2`), and an optional `tablePrefix` is prepended to each final name (`status` → `rx_status`). Set `snakeCaseTables: false` to keep keys verbatim.

## Repositories

Extend `Repository` and use `this.db` — a fully typed Kysely instance over `Database`:

```ts
import { Repository } from "@resolid/app-db";

export class SystemRepository extends Repository {
  async getFirst(): Promise<Status | undefined> {
    return this.db.selectFrom("status").selectAll().limit(1).executeTakeFirst();
  }
}
```

`Repository<DB>` takes the database schema as its type parameter and defaults to the shared `Database` interface, so a repository bound to another schema (or another named connection via `source`) can be written explicitly.

## Query logging

All queries flow through a shared logger factory, so every connection emits app events regardless of the console `logger` setting:

- `db:query` — `(name: string, sql: string, durationMs: number)` per executed query
- `db:error` — `(name: string, message: string)` per failed query, where `name` is the connection name (`main` by default)

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
