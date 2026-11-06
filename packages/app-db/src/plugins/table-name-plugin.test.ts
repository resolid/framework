import {
  DummyDriver,
  Kysely,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type Generated,
} from "kysely";
import { describe, expect, it } from "vitest";
import { TableNamePlugin, type TableNamePluginOptions } from "./table-name-plugin";

interface TestDatabase {
  user: {
    id: Generated<number>;
    name: string;
  };
  userOrders: {
    id: Generated<number>;
    createdAt: string;
  };
  orderItems: {
    id: Generated<number>;
    memo: string;
  };
  HTTPServer: {
    id: Generated<number>;
  };
  parseJSON: {
    id: Generated<number>;
  };
  user2fa: {
    id: Generated<number>;
  };
  SERVER2: {
    id: Generated<number>;
  };
}

function createDb(options: TableNamePluginOptions = {}): Kysely<TestDatabase> {
  return new Kysely<TestDatabase>({
    dialect: {
      createAdapter: () => new SqliteAdapter(),
      createDriver: () => new DummyDriver(),
      createIntrospector: (db) => new SqliteIntrospector(db),
      createQueryCompiler: () => new SqliteQueryCompiler(),
    },
    plugins: [new TableNamePlugin(options)],
  });
}

describe("TableNamePlugin", () => {
  describe("snakeCase", () => {
    it("should convert camelCase table names in select queries", () => {
      const { sql } = createDb().selectFrom("userOrders").selectAll().compile();

      expect(sql).toBe('select * from "user_orders"');
    });

    it("should convert camelCase table names in insert queries", () => {
      const { sql } = createDb()
        .insertInto("userOrders")
        .values({ createdAt: "2026-10-20" })
        .compile();

      expect(sql).toBe('insert into "user_orders" ("createdAt") values (?)');
    });

    it("should convert joined table names but keep aliases untouched", () => {
      const { sql } = createDb()
        .selectFrom("userOrders")
        .innerJoin("orderItems as oi", "oi.id", "userOrders.id")
        .select("userOrders.id")
        .compile();

      expect(sql).toBe(
        'select "user_orders"."id" from "user_orders" inner join "order_items" as "oi" on "oi"."id" = "user_orders"."id"',
      );
    });

    it("should convert cte names consistently", () => {
      const { sql } = createDb()
        .with("userOrderItems", (qb) => qb.selectFrom("orderItems").selectAll())
        .selectFrom("userOrderItems")
        .selectAll()
        .compile();

      expect(sql).toBe(
        'with "user_order_items" as (select * from "order_items") select * from "user_order_items"',
      );
    });

    it("should leave column names untouched", () => {
      const { sql } = createDb()
        .selectFrom("userOrders")
        .select(["userOrders.id", "userOrders.createdAt"])
        .compile();

      expect(sql).toBe('select "user_orders"."id", "user_orders"."createdAt" from "user_orders"');
    });

    it("should keep acronyms and digit-adjacent words intact", () => {
      expect(createDb().selectFrom("HTTPServer").selectAll().compile().sql).toBe(
        'select * from "http_server"',
      );
      expect(createDb().selectFrom("parseJSON").selectAll().compile().sql).toBe(
        'select * from "parse_json"',
      );
      expect(createDb().selectFrom("user2fa").selectAll().compile().sql).toBe(
        'select * from "user2fa"',
      );
      expect(createDb().selectFrom("SERVER2").selectAll().compile().sql).toBe(
        'select * from "server_2"',
      );
    });

    it("should pass already snake_case names through unchanged", () => {
      const db = createDb() as Kysely<{
        audit_log: { id: Generated<number> };
      }>;
      const { sql } = db.selectFrom("audit_log").selectAll().compile();

      expect(sql).toBe('select * from "audit_log"');
    });

    it("should keep table names verbatim when disabled", () => {
      const { sql } = createDb({ snakeCase: false }).selectFrom("userOrders").selectAll().compile();

      expect(sql).toBe('select * from "userOrders"');
    });
  });

  describe("prefix", () => {
    it("should prefix table names in select queries", () => {
      const { sql } = createDb({ prefix: "rx_" }).selectFrom("user").selectAll().compile();

      expect(sql).toBe('select * from "rx_user"');
    });

    it("should prefix table names in insert queries", () => {
      const { sql } = createDb({ prefix: "rx_" })
        .insertInto("user")
        .values({ name: "resolid" })
        .compile();

      expect(sql).toBe('insert into "rx_user" ("name") values (?)');
    });

    it("should prefix table names in schema builders", () => {
      const { sql } = createDb({ prefix: "rx_" })
        .schema.createTable("user")
        .addColumn("id", "integer")
        .addColumn("name", "text")
        .compile();

      expect(sql).toBe('create table "rx_user" ("id" integer, "name" text)');
    });

    it("should leave table names untouched for an empty prefix", () => {
      const { sql } = createDb({ prefix: "" }).selectFrom("user").selectAll().compile();

      expect(sql).toBe('select * from "user"');
    });
  });

  it("should apply snake case before the prefix", () => {
    const { sql } = createDb({ prefix: "rx_" }).selectFrom("userOrders").selectAll().compile();

    expect(sql).toBe('select * from "rx_user_orders"');
  });

  it("should leave table names untouched when both features are disabled", () => {
    const { sql } = createDb({ snakeCase: false, prefix: "" })
      .selectFrom("userOrders")
      .selectAll()
      .compile();

    expect(sql).toBe('select * from "userOrders"');
  });

  it("should keep cached names separate for different options", () => {
    expect(createDb({ prefix: "a_" }).selectFrom("userOrders").selectAll().compile().sql).toBe(
      'select * from "a_user_orders"',
    );
    expect(createDb({ prefix: "b_" }).selectFrom("userOrders").selectAll().compile().sql).toBe(
      'select * from "b_user_orders"',
    );
    expect(createDb({ snakeCase: false }).selectFrom("userOrders").selectAll().compile().sql).toBe(
      'select * from "userOrders"',
    );
  });
});
