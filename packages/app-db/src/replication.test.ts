import type { ReplicaStrategy } from "kysely-replication";
import type { Pool as MySqlPool } from "mysql2";
import type { Pool as PostgresPool, PoolOptions as PostgresPoolOptions } from "pg";
import Database from "better-sqlite3";
import {
  type Generated,
  type Kysely,
  sql,
  SqliteAdapter,
  SqliteDialect,
  type SqliteDialectConfig,
} from "kysely";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MySqlConnection } from "./adapters/mysql";
import { PostgresConnection } from "./adapters/postgres";
import { DatabaseConnection } from "./core/connection";
import { insertOne } from "./helper/insert-one";
import "./replication";

interface TestDatabase {
  item: {
    id: Generated<number>;
    name: string;
  };
}

interface TestConnectionConfig {
  replicaCount?: number;
  replicaStrategy?: ReplicaStrategy;
  adapterFactory?: () => SqliteAdapter;
}

class CustomAdapterSqliteDialect extends SqliteDialect {
  readonly #adapterFactory: () => SqliteAdapter;

  constructor(config: SqliteDialectConfig, adapterFactory: () => SqliteAdapter) {
    super(config);
    this.#adapterFactory = adapterFactory;
  }

  override createAdapter(): SqliteAdapter {
    return this.#adapterFactory();
  }
}

class NoReturningSqliteAdapter extends SqliteAdapter {
  override get supportsReturning(): boolean {
    return false;
  }
}

class ReplicatedSqliteConnection extends DatabaseConnection<TestConnectionConfig> {
  readonly databases: Database.Database[] = [];

  protected createDialect(): SqliteDialect {
    return this.createSqliteDialect();
  }

  protected override createReplicaDialects(): SqliteDialect[] {
    return Array.from({ length: this.config.replicaCount ?? 1 }, () => this.createSqliteDialect());
  }

  protected override get replicaStrategy(): ReplicaStrategy | undefined {
    return this.config.replicaStrategy;
  }

  private createSqliteDialect(): SqliteDialect {
    const database = new Database(":memory:");
    const config = { database };

    this.databases.push(database);

    return this.config.adapterFactory
      ? new CustomAdapterSqliteDialect(config, this.config.adapterFactory)
      : new SqliteDialect(config);
  }
}

const openConnections: ReplicatedSqliteConnection[] = [];

async function connectReplicated(config: TestConnectionConfig = {}) {
  const connection = new ReplicatedSqliteConnection(config);

  openConnections.push(connection);
  connection.connect({});

  for (const database of connection.databases) {
    database.exec("create table item (id integer primary key autoincrement, name text not null)");
  }

  return { connection, db: connection.database as Kysely<TestDatabase> };
}

function seed(database: Database.Database, name: string) {
  database.prepare("insert into item (name) values (?)").run(name);
}

function readNames(database: Database.Database): string[] {
  return database
    .prepare("select name from item order by id")
    .all()
    .map((row) => (row as { name: string }).name);
}

function postgresPoolOptions(connectionString: string): PostgresPoolOptions {
  return {
    connectionString,
    max: 10,
    maxUses: Infinity,
    allowExitOnIdle: false,
    maxLifetimeSeconds: 0,
    idleTimeoutMillis: 10_000,
  };
}

afterEach(async () => {
  await Promise.all(openConnections.splice(0).map((connection) => connection.close()));
});

describe("read replicas", () => {
  it("should route reads to replicas and writes to the primary", async () => {
    const { connection, db } = await connectReplicated();

    seed(connection.databases[0]!, "primary");
    seed(connection.databases[1]!, "replica");

    await expect(db.selectFrom("item").selectAll().execute()).resolves.toEqual([
      { id: 1, name: "replica" },
    ]);

    await db.insertInto("item").values({ name: "write" }).execute();

    expect(readNames(connection.databases[0]!)).toEqual(["primary", "write"]);
    expect(readNames(connection.databases[1]!)).toEqual(["replica"]);
  });

  it("should round robin between replicas by default", async () => {
    const { connection, db } = await connectReplicated({ replicaCount: 2 });

    seed(connection.databases[1]!, "replica-0");
    seed(connection.databases[2]!, "replica-1");

    await expect(db.selectFrom("item").selectAll().execute()).resolves.toEqual([
      { id: 1, name: "replica-0" },
    ]);
    await expect(db.selectFrom("item").selectAll().execute()).resolves.toEqual([
      { id: 1, name: "replica-1" },
    ]);
  });

  it("should use the configured replica strategy", async () => {
    const next = vi.fn(async () => 1);
    const replicaStrategy: ReplicaStrategy = { next, onTransaction: "error" };

    const { connection, db } = await connectReplicated({ replicaCount: 2, replicaStrategy });

    seed(connection.databases[1]!, "replica-0");
    seed(connection.databases[2]!, "replica-1");

    await expect(db.selectFrom("item").selectAll().execute()).resolves.toEqual([
      { id: 1, name: "replica-1" },
    ]);
    expect(next).toHaveBeenCalledWith(2);
  });

  it("should force the primary or a specific replica with withPrimary/withReplica", async () => {
    const { connection, db } = await connectReplicated({ replicaCount: 2 });

    seed(connection.databases[0]!, "primary");
    seed(connection.databases[1]!, "replica-0");
    seed(connection.databases[2]!, "replica-1");

    await expect(db.withPrimary().selectFrom("item").selectAll().execute()).resolves.toEqual([
      { id: 1, name: "primary" },
    ]);
    await expect(db.withReplica(1).selectFrom("item").selectAll().execute()).resolves.toEqual([
      { id: 1, name: "replica-1" },
    ]);
  });

  it("should route transactions to the primary", async () => {
    const { connection, db } = await connectReplicated();

    seed(connection.databases[0]!, "primary");
    seed(connection.databases[1]!, "replica");

    const item = await db.transaction().execute(async (trx) => {
      return trx.selectFrom("item").selectAll().executeTakeFirstOrThrow();
    });

    expect(item).toEqual({ id: 1, name: "primary" });
  });

  it("should route raw SQL to the primary", async () => {
    const { connection, db } = await connectReplicated();

    seed(connection.databases[0]!, "primary");
    seed(connection.databases[1]!, "replica");

    const result = await sql<{ name: string }>`select name from item`.execute(db);

    expect(result.rows).toEqual([{ name: "primary" }]);
  });

  it("should read the inserted row back from the primary in insertOne", async () => {
    const { connection, db } = await connectReplicated({
      adapterFactory: () => new NoReturningSqliteAdapter(),
    });

    const item = await insertOne(db, "item", { name: "inserted" });

    expect(item).toEqual({ id: 1, name: "inserted" });
    expect(readNames(connection.databases[0]!)).toEqual(["inserted"]);
    expect(readNames(connection.databases[1]!)).toEqual([]);
  });

  it("should read the inserted row back without replication", async () => {
    const { db } = await connectReplicated({
      replicaCount: 0,
      adapterFactory: () => new NoReturningSqliteAdapter(),
    });

    await expect(insertOne(db, "item", { name: "inserted" })).resolves.toEqual({
      id: 1,
      name: "inserted",
    });
  });
});

describe("replica pools", () => {
  it("should call onPoolCreated for the primary and every Postgres replica", async () => {
    const pools: PostgresPool[] = [];
    const connection = new PostgresConnection({
      poolOptions: postgresPoolOptions("postgres://localhost:5432/primary"),
      replicas: [
        { poolOptions: postgresPoolOptions("postgres://localhost:5432/replica-1") },
        { poolOptions: postgresPoolOptions("postgres://localhost:5432/replica-2") },
      ],
      onPoolCreated: (pool) => pools.push(pool),
    });

    connection.connect({});

    expect(pools).toHaveLength(3);

    await connection.close();
    await Promise.all(pools.map((pool) => pool.end()));
  });

  it("should call onPoolCreated for the primary and every MySQL replica", async () => {
    const pools: MySqlPool[] = [];
    const connection = new MySqlConnection({
      poolOptions: { uri: "mysql://localhost:3306/primary" },
      replicas: [
        { poolOptions: { uri: "mysql://localhost:3306/replica-1" } },
        { poolOptions: { uri: "mysql://localhost:3306/replica-2" } },
      ],
      onPoolCreated: (pool) => pools.push(pool),
    });

    connection.connect({});

    expect(pools).toHaveLength(3);

    await connection.close();
    await Promise.all(
      pools.map(
        (pool) =>
          new Promise<void>((resolve, reject) => {
            pool.end((error) => (error ? reject(error) : resolve()));
          }),
      ),
    );
  });
});
