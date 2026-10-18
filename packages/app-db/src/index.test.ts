import { createApp } from "@resolid/app";
import { type DrizzleConfig, getTableName, type Logger } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createMySqlDefineTable, int as mysqlInt } from "./adapters/mysql";
import { createPostgresDefineTable, integer as postgresInt } from "./adapters/postgres";
import { DatabaseConnection } from "./core/connection";
import { Repository } from "./core/repository";
import { createDatabaseExtension, DatabaseService } from "./core/service";

interface FakeDb {
  readonly tag: string;
}

interface FakePool {
  closed: boolean;
}

class FakeConnection extends DatabaseConnection<FakeDb, FakePool> {
  readonly tag: string;
  readonly failClose: boolean;

  connectCount = 0;
  closeCount = 0;
  lastLogger: DrizzleConfig["logger"] = undefined;

  constructor(tag: string, options: { failClose?: boolean } = {}) {
    super();

    this.tag = tag;
    this.failClose = options.failClose ?? false;
  }

  override connect(config: DrizzleConfig): void {
    this.connectCount += 1;
    this.lastLogger = config.logger;

    this.setDb({ tag: this.tag, $client: { closed: false } });
  }

  override close(): void {
    this.closeCount += 1;

    if (this.failClose) {
      throw new Error(`Failed to close ${this.tag}`);
    }

    if (this.connected) {
      this.getDb().$client.closed = true;
    }
  }
}

class FakeRepository extends Repository<FakeDb> {
  getTag(): string {
    return this.db.tag;
  }
}

class ReplicaRepository extends Repository<FakeDb> {
  protected override source = "replica";

  getTag(): string {
    return this.db.tag;
  }
}

async function createTestApp(connection = new FakeConnection("main")) {
  const app = await createApp({
    name: "TestApp",
    extensions: [
      createDatabaseExtension<FakeDb, FakePool>({
        connection,
        drizzleConfig: { logger: false },
      }),
    ],
    expose: { database: DatabaseService },
  });

  return { app, connection };
}

describe("DatabaseConnection", () => {
  it("should throw when used before connect", () => {
    const connection = new FakeConnection("main");

    expect(connection.connected).toBe(false);
    expect(() => connection.getDb()).toThrow("not been initialized");
  });

  it("should expose the client once connected", () => {
    const connection = new FakeConnection("main");

    connection.connect({});

    expect(connection.connected).toBe(true);
    expect(connection.getDb().$client.closed).toBe(false);
  });
});

describe("DatabaseService", () => {
  it("should connect the default connection on bootstrap", async () => {
    const { app, connection } = await createTestApp();

    await app.run();

    expect(connection.connectCount).toBe(1);
    expect(app.$.database.get<FakeDb>().tag).toBe("main");

    await app.dispose();

    expect(connection.closeCount).toBe(1);
  });

  it("should not reconnect on subsequent connect calls", async () => {
    const { app, connection } = await createTestApp();

    await app.run();
    await app.$.database.connect();

    expect(connection.connectCount).toBe(1);
  });

  it("should emit db:query with the connection name", async () => {
    const { app, connection } = await createTestApp();

    await app.run();

    const events: unknown[] = [];

    app.emitter.on("db:query", (name, query, params) => {
      events.push([name, query, params]);
    });

    (connection.lastLogger as Logger).logQuery("select 1", [1]);

    expect(events).toEqual([["main", "select 1", [1]]]);
  });

  it("should throw for an unknown connection", async () => {
    const { app } = await createTestApp();

    await app.run();

    expect(() => app.$.database.get("missing")).toThrow(
      "Connection with name missing does not exist.",
    );
  });

  it("should throw when the connection is not established yet", async () => {
    const { app } = await createTestApp();

    expect(() => app.$.database.get<FakeDb>()).toThrow("does not exist");
  });
});

describe("DatabaseService with multiple connections", () => {
  it("should resolve connections by name and dispose all of them", async () => {
    const main = new FakeConnection("main");
    const replica = new FakeConnection("replica");

    const app = await createApp({
      name: "TestApp",
      extensions: [
        createDatabaseExtension<Record<string, FakeDb>, FakePool>({
          connections: { main, replica },
          drizzleConfig: { logger: false },
        }),
      ],
      expose: { database: DatabaseService },
    });

    await app.run();

    expect(app.$.database.get<FakeDb>().tag).toBe("main");
    expect(app.$.database.get<FakeDb>("replica").tag).toBe("replica");

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
        createDatabaseExtension<Record<string, FakeDb>, FakePool>({
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
    const main = new FakeConnection("main");
    const replica = new FakeConnection("replica");

    const app = await createApp({
      name: "TestApp",
      extensions: [
        createDatabaseExtension<Record<string, FakeDb>, FakePool>({
          connections: { main, replica },
        }),
      ],
      providers: [
        { token: FakeRepository, factory: () => new FakeRepository() },
        { token: ReplicaRepository, factory: () => new ReplicaRepository() },
      ],
    });

    await app.run();

    expect(app.get(FakeRepository).getTag()).toBe("main");
    expect(app.get(ReplicaRepository).getTag()).toBe("replica");
  });
});

describe("define table helpers", () => {
  it("should prefix mysql table names", () => {
    const defineTable = createMySqlDefineTable("rx_");

    expect(getTableName(defineTable("user", { id: mysqlInt() }))).toBe("rx_user");
  });

  it("should prefix postgres table names", () => {
    const defineTable = createPostgresDefineTable("rx_");

    expect(getTableName(defineTable("user", { id: postgresInt() }))).toBe("rx_user");
  });
});
