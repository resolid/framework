import { createApp } from "@resolid/app";
import {
  CompiledQuery,
  DummyDriver,
  type Generated,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type Dialect,
  type KyselyPlugin,
  type Logger,
} from "kysely";
import { describe, expect, it } from "vitest";
import { SqliteConnection } from "./adapters/sqlite";
import { DatabaseConnection } from "./core/connection";
import { Repository } from "./core/repository";
import { createDatabaseExtension, DatabaseService } from "./core/service";

const fakeDialect: Dialect = {
  createAdapter: () => new SqliteAdapter(),
  createDriver: () => new DummyDriver(),
  createIntrospector: (db) => new SqliteIntrospector(db),
  createQueryCompiler: () => new SqliteQueryCompiler(),
};

interface ConnectOptions {
  logger?: Logger;
  plugins?: KyselyPlugin[];
}

class FakeConnection extends DatabaseConnection<Record<string, never>> {
  readonly tag: string;
  readonly failClose: boolean;

  connectCount = 0;
  closeCount = 0;
  connectOptions?: ConnectOptions;

  constructor(tag: string, options: { failClose?: boolean } = {}) {
    super({});

    this.tag = tag;
    this.failClose = options.failClose ?? false;
  }

  protected override createDialect(): Dialect {
    return fakeDialect;
  }

  override connect(options: ConnectOptions): void {
    this.connectCount += 1;
    this.connectOptions = options;

    super.connect(options);
  }

  override async close(): Promise<void> {
    this.closeCount += 1;

    if (this.failClose) {
      throw new Error(`Failed to close ${this.tag}`);
    }
  }
}

interface FakeDatabase {
  user: {
    name: string;
  };
}

class FakeRepository extends Repository<FakeDatabase> {
  async findFirstUser(): Promise<FakeDatabase["user"] | undefined> {
    return this.db.selectFrom("user").selectAll().limit(1).executeTakeFirst();
  }
}

async function createTestApp(connection = new FakeConnection("main")) {
  const app = await createApp({
    name: "TestApp",
    extensions: [
      createDatabaseExtension({
        connection,
        logger: false,
        plugins: [{} as KyselyPlugin],
      }),
    ],
    expose: { database: DatabaseService },
  });

  return { app, connection };
}

describe("DatabaseConnection", () => {
  it("should throw when database is used before connect", () => {
    const connection = new FakeConnection("main");

    expect(() => connection.database).toThrow("not been initialized");
  });

  it("should not destroy an unconnected database twice", async () => {
    const connection = new FakeConnection("main");

    await connection.close();
    await expect(connection.close()).resolves.toBeUndefined();
  });
});

describe("DatabaseService", () => {
  it("should connect the default connection on bootstrap", async () => {
    const { app, connection } = await createTestApp();

    await app.run();

    expect(connection.connectCount).toBe(1);
    expect(connection.connectOptions?.logger).toBeDefined();

    await app.dispose();

    expect(connection.closeCount).toBe(1);
  });

  it("should not start twice", async () => {
    const { app, connection } = await createTestApp();

    await app.run();
    await app.get(DatabaseService).start();

    expect(connection.connectCount).toBe(1);
  });

  it("should pass plugins through to kysely", async () => {
    const pluginStub = {} as KyselyPlugin;
    const connection = new FakeConnection("main");

    const app = await createApp({
      name: "TestApp",
      extensions: [
        createDatabaseExtension({
          connection,
          plugins: [pluginStub],
          logger: false,
        }),
      ],
      expose: { database: DatabaseService },
    });

    await app.run();

    expect(connection.connectOptions?.plugins ?? []).toContain(pluginStub);
  });

  it("should emit db:query with the source name", async () => {
    const { app, connection } = await createTestApp();

    await app.run();

    const events: unknown[] = [];

    app.emitter.on("db:query", (name, query, duration) => {
      events.push([name, query, duration]);
    });

    if (!connection.connectOptions?.logger) {
      throw new Error("Logger is missing on the connect options.");
    }

    void connection.connectOptions.logger({
      level: "query",
      query: CompiledQuery.raw("select 1", [1]),
      queryDurationMillis: 12,
    });

    expect(events).toEqual([["main", "select 1", 12]]);
  });

  it("should throw for an unknown source", async () => {
    const { app } = await createTestApp();

    await app.run();

    expect(() => app.get(DatabaseService).get("missing")).toThrow(
      "Connection with name missing does not exist.",
    );
  });

  it("should throw when not started yet", async () => {
    const { app } = await createTestApp();

    expect(() => app.get(DatabaseService).get()).toThrow("does not exist");
  });
});

describe("DatabaseService with multiple connections", () => {
  it("should resolve connections by name and dispose all of them", async () => {
    const main = new FakeConnection("main");
    const replica = new FakeConnection("replica");

    const app = await createApp({
      name: "TestApp",
      extensions: [
        createDatabaseExtension({
          connections: { main, replica },
          plugins: [],
        }),
      ],
      expose: { database: DatabaseService },
    });

    await app.run();

    const mainDb = app.get(DatabaseService).get<FakeDatabase>();
    const replicaDb = app.get(DatabaseService).get<FakeDatabase>("replica");

    expect(mainDb).not.toBe(replicaDb);
    expect(await replicaDb.selectFrom("user").selectAll().execute()).toEqual([]);

    await app.dispose();

    expect(main.closeCount).toBe(1);
    expect(replica.closeCount).toBe(1);
  });

  it("should still close every connection when one fails", async () => {
    const main = new FakeConnection("main", { failClose: true });
    const replica = new FakeConnection("replica");

    const app = await createApp({
      name: "TestApp",
      extensions: [
        createDatabaseExtension({
          connections: { main, replica },
        }),
      ],
      expose: { database: DatabaseService },
    });

    await app.run();

    await expect(app.get(DatabaseService).dispose()).rejects.toThrow(
      "Failed to close 1 database connection(s): Failed to close main",
    );

    expect(main.closeCount).toBe(1);
    expect(replica.closeCount).toBe(1);
  });
});

describe("Repository", () => {
  it("should resolve the service through dependency injection", async () => {
    const app = await createApp({
      name: "TestApp",
      extensions: [
        createDatabaseExtension({
          connection: new FakeConnection("main"),
        }),
      ],
      providers: [{ token: FakeRepository, factory: () => new FakeRepository() }],
    });

    await app.run();

    const user = await app.get(FakeRepository).findFirstUser();

    expect(user).toBeUndefined();
  });
});

interface TestDatabase {
  user: {
    id: Generated<number>;
    name: string;
  };
  userOrders: {
    id: Generated<number>;
  };
}

describe("SqliteConnection", () => {
  it("should run kysely queries through the sqlite dialect", async () => {
    const app = await createApp({
      name: "TestApp",
      extensions: [
        createDatabaseExtension({
          connection: new SqliteConnection({ databaseFile: ":memory:" }),
        }),
      ],
      expose: { database: DatabaseService },
    });

    await app.run();

    const events: [string, string][] = [];

    app.emitter.on("db:query", (source, query) => {
      events.push([source, query]);
    });

    const db = app.get(DatabaseService).get<TestDatabase>();

    await db.schema
      .createTable("user")
      .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
      .addColumn("name", "text", (col) => col.notNull())
      .execute();

    await db.insertInto("user").values({ name: "resolid" }).execute();

    const users = await db.selectFrom("user").selectAll().execute();

    expect(users).toEqual([{ id: 1, name: "resolid" }]);
    expect(events.some(([, query]) => query.includes("create table"))).toBe(true);
    expect(events.filter(([source]) => source === "main").length).toBeGreaterThan(0);

    await app.dispose();
  });

  it("should prefix table names through the tablePrefix config", async () => {
    const app = await createApp({
      name: "TestApp",
      extensions: [
        createDatabaseExtension({
          connection: new SqliteConnection({
            databaseFile: ":memory:",
            tablePrefix: "rx_",
          }),
        }),
      ],
      expose: { database: DatabaseService },
    });

    await app.run();

    const events: [string, string][] = [];

    app.emitter.on("db:query", (source, query) => {
      events.push([source, query]);
    });

    const db = app.get(DatabaseService).get<TestDatabase>();

    await db.schema
      .createTable("user")
      .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
      .addColumn("name", "text", (col) => col.notNull())
      .execute();

    await db.insertInto("user").values({ name: "resolid" }).execute();

    const users = await db.selectFrom("user").selectAll().execute();

    expect(users).toEqual([{ id: 1, name: "resolid" }]);
    expect(events.some(([, query]) => query.includes('"rx_user"'))).toBe(true);

    await app.dispose();
  });

  it("should snake case table names by default", async () => {
    const app = await createApp({
      name: "TestApp",
      extensions: [
        createDatabaseExtension({
          connection: new SqliteConnection({
            databaseFile: ":memory:",
          }),
        }),
      ],
      expose: { database: DatabaseService },
    });

    await app.run();

    const events: [string, string][] = [];

    app.emitter.on("db:query", (source, query) => {
      events.push([source, query]);
    });

    const db = app.get(DatabaseService).get<TestDatabase>();

    await db.schema
      .createTable("userOrders")
      .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
      .execute();

    expect(events.some(([, query]) => query.includes('create table "user_orders"'))).toBe(true);

    await app.dispose();
  });

  it("should keep table names verbatim when snakeCaseTables is disabled", async () => {
    const app = await createApp({
      name: "TestApp",
      extensions: [
        createDatabaseExtension({
          connection: new SqliteConnection({
            databaseFile: ":memory:",
            snakeCaseTables: false,
          }),
        }),
      ],
      expose: { database: DatabaseService },
    });

    await app.run();

    const events: [string, string][] = [];

    app.emitter.on("db:query", (source, query) => {
      events.push([source, query]);
    });

    const db = app.get(DatabaseService).get<TestDatabase>();

    await db.schema
      .createTable("userOrders")
      .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
      .execute();

    expect(events.some(([, query]) => query.includes('"userOrders"'))).toBe(true);

    await app.dispose();
  });
});
