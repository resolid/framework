import { createApp } from "@resolid/app";
import {
  CompiledQuery,
  DummyDriver,
  type Generated,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type DatabaseConnection as KyselyDatabaseConnection,
  type Dialect,
  type KyselyPlugin,
  type Logger,
  type TransactionSettings,
} from "kysely";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { DatabaseExecutor, DatabaseTransaction } from "./core/types";
import { SqliteConnection } from "./adapters/sqlite";
import { BaseRepository } from "./base/repository";
import { DatabaseConnection } from "./core/connection";
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

class RecordingDriver extends DummyDriver {
  readonly settings: TransactionSettings[] = [];

  override async beginTransaction(
    _connection?: KyselyDatabaseConnection,
    settings?: TransactionSettings,
  ): Promise<void> {
    if (settings) {
      this.settings.push(settings);
    }
  }
}

class RecordingConnection extends DatabaseConnection<Record<string, never>> {
  readonly driver = new RecordingDriver();

  protected override createDialect(): Dialect {
    return {
      createAdapter: () => new SqliteAdapter(),
      createDriver: () => this.driver,
      createIntrospector: (db) => new SqliteIntrospector(db),
      createQueryCompiler: () => new SqliteQueryCompiler(),
    };
  }
}

interface FakeDatabase {
  user: {
    name: string;
  };
}

class FakeRepository extends BaseRepository<FakeDatabase> {
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
    await app.get(DatabaseService).init();

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

  it("should emit db:query with the connection name", async () => {
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

    expect(events).toEqual([["default", "select 1", 12]]);
  });

  it("should throw for an unknown connectionName", async () => {
    const { app } = await createTestApp();

    await app.run();

    expect(() => app.get(DatabaseService).get("missing")).toThrow(
      "Connection with name missing does not exist.",
    );
  });

  it("should throw when not started yet", async () => {
    const { app } = await createTestApp();

    expect(() => app.get(DatabaseService).get()).toThrow(
      "Database connection has not been initialized",
    );
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

describe("BaseRepository", () => {
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

class SqliteUserRepository extends BaseRepository<TestDatabase> {
  async insert(name: string): Promise<void> {
    await this.db.insertInto("user").values({ name }).execute();
  }

  async selectAll(): Promise<{ id: number; name: string }[]> {
    return this.db.selectFrom("user").selectAll().execute();
  }
}

class AnalyticsRepository extends BaseRepository<TestDatabase, "analytics"> {
  protected override connectionName = "analytics" as const;

  async selectAll(): Promise<{ id: number; name: string }[]> {
    return this.db.selectFrom("user").selectAll().execute();
  }
}

class MainRepository extends BaseRepository<TestDatabase, "main"> {
  protected override connectionName = "main" as const;
}

class ReplicaRepository extends BaseRepository<TestDatabase, "replica"> {
  protected override connectionName = "replica" as const;
}

function constructMainFromAnalytics(executor: DatabaseExecutor<TestDatabase, "analytics">) {
  // @ts-expect-error - a main repository cannot use an analytics executor
  return new MainRepository(executor);
}

function constructMainFromService(service: DatabaseService) {
  // @ts-expect-error - the executor is scoped to the analytics connection
  return new MainRepository(service.get<TestDatabase, "analytics">("analytics"));
}

function withMainExecutor(
  repository: MainRepository,
  executor: DatabaseExecutor<TestDatabase, "analytics">,
) {
  // @ts-expect-error - withExecutor keeps the repository connection
  return repository.withExecutor(executor);
}

function constructAnalytics(executor: DatabaseExecutor<TestDatabase, "analytics">) {
  return new AnalyticsRepository(executor);
}

function constructAnalyticsFromService(service: DatabaseService) {
  return new AnalyticsRepository(service.get<TestDatabase, "analytics">("analytics"));
}

function withAnalyticsExecutor(
  repository: AnalyticsRepository,
  executor: DatabaseExecutor<TestDatabase, "analytics">,
) {
  return repository.withExecutor(executor);
}

async function createSqliteAppWithUserTable() {
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

  const database = app.get(DatabaseService);

  await database
    .get<TestDatabase>()
    .schema.createTable("user")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("name", "text", (col) => col.notNull())
    .execute();

  return { app, database };
}

describe("Database transactions", () => {
  it("should share the transaction between a repository and its executor", async () => {
    const { app, database } = await createSqliteAppWithUserTable();

    const users = new SqliteUserRepository(database);

    await users.transaction(async (repository) => {
      await repository.insert("committed");
    });

    expect(await users.selectAll()).toEqual([{ id: 1, name: "committed" }]);

    await app.dispose();
  });

  it("should roll back repository writes when the transaction fails", async () => {
    const { app, database } = await createSqliteAppWithUserTable();

    const users = new SqliteUserRepository(database);

    await expect(
      users.transaction(async (repository) => {
        await repository.insert("rolled-back");

        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");

    expect(await users.selectAll()).toEqual([]);

    await app.dispose();
  });

  it("should pass access mode and isolation level to the driver", async () => {
    const connection = new RecordingConnection({});
    const app = await createApp({
      name: "TestApp",
      extensions: [
        createDatabaseExtension({
          connection,
          plugins: [],
        }),
      ],
      expose: { database: DatabaseService },
    });

    await app.run();

    const users = new SqliteUserRepository(app.get(DatabaseService));

    const result = await users.transaction(
      async (repository) => {
        await repository.selectAll();

        return "done";
      },
      { accessMode: "read only", isolationLevel: "serializable" },
    );

    expect(result).toBe("done");
    expect(connection.driver.settings).toEqual([
      { accessMode: "read only", isolationLevel: "serializable" },
    ]);

    await app.dispose();
  });

  it("should roll back on the repository connection when the handler fails", async () => {
    const app = await createApp({
      name: "TestApp",
      extensions: [
        createDatabaseExtension({
          connections: {
            main: new FakeConnection("main"),
            replica: new FakeConnection("replica"),
          },
          plugins: [],
        }),
      ],
      expose: { database: DatabaseService },
    });

    await app.run();

    const events: [string, string][] = [];

    app.emitter.on("db:query", (name, query) => {
      events.push([name, query]);
    });

    const repository = new ReplicaRepository(app.get(DatabaseService));

    await expect(
      repository.transaction(async (_repository, trx) => {
        await trx.selectFrom("user").selectAll().execute();

        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");

    expect(events.some(([name, query]) => name === "replica" && query.includes("select"))).toBe(
      true,
    );
    expect(events.every(([name]) => name === "replica")).toBe(true);

    await app.dispose();
  });

  it("should start the transaction on the repository connection", async () => {
    const app = await createApp({
      name: "TestApp",
      extensions: [
        createDatabaseExtension({
          connections: {
            main: new FakeConnection("main"),
            analytics: new FakeConnection("analytics"),
          },
          plugins: [],
        }),
      ],
      expose: { database: DatabaseService },
    });

    await app.run();

    const events: [string, string][] = [];

    app.emitter.on("db:query", (name, query) => {
      events.push([name, query]);
    });

    const repository = new AnalyticsRepository(app.get(DatabaseService));

    const result = await repository.transaction(async (repo, trx) => {
      expectTypeOf(repo).toEqualTypeOf<AnalyticsRepository>();
      expectTypeOf(trx).toEqualTypeOf<DatabaseTransaction<TestDatabase, "analytics">>();

      await repo.selectAll();

      return "done";
    });

    expect(result).toBe("done");
    expect(events.length).toBeGreaterThan(0);
    expect(events.every(([name]) => name === "analytics")).toBe(true);

    await app.dispose();
  });

  it("should reject executors from another connection", () => {
    expect(constructMainFromAnalytics).toBeTypeOf("function");
    expect(constructMainFromService).toBeTypeOf("function");
    expect(withMainExecutor).toBeTypeOf("function");
  });

  it("should accept executors from the same connection", () => {
    expect(constructAnalytics).toBeTypeOf("function");
    expect(constructAnalyticsFromService).toBeTypeOf("function");
    expect(withAnalyticsExecutor).toBeTypeOf("function");
  });
});

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

    app.emitter.on("db:query", (name, query) => {
      events.push([name, query]);
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
    expect(events.filter(([name]) => name === "default").length).toBeGreaterThan(0);

    await app.dispose();
  });

  it("should prefix table names through the tableName config", async () => {
    const app = await createApp({
      name: "TestApp",
      extensions: [
        createDatabaseExtension({
          connection: new SqliteConnection({
            databaseFile: ":memory:",
            tableName: { prefix: "rx_" },
          }),
        }),
      ],
      expose: { database: DatabaseService },
    });

    await app.run();

    const events: [string, string][] = [];

    app.emitter.on("db:query", (name, query) => {
      events.push([name, query]);
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

    app.emitter.on("db:query", (name, query) => {
      events.push([name, query]);
    });

    const db = app.get(DatabaseService).get<TestDatabase>();

    await db.schema
      .createTable("userOrders")
      .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
      .execute();

    expect(events.some(([, query]) => query.includes('create table "user_orders"'))).toBe(true);

    await app.dispose();
  });

  it("should keep table names verbatim when snakeCase is disabled", async () => {
    const app = await createApp({
      name: "TestApp",
      extensions: [
        createDatabaseExtension({
          connection: new SqliteConnection({
            databaseFile: ":memory:",
            tableName: { snakeCase: false },
          }),
        }),
      ],
      expose: { database: DatabaseService },
    });

    await app.run();

    const events: [string, string][] = [];

    app.emitter.on("db:query", (name, query) => {
      events.push([name, query]);
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
