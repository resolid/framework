import {
  DummyDriver,
  type KyselyPlugin,
  Kysely,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type Generated,
} from "kysely";
import { describe, expect, it } from "vitest";
import { TablePrefixPlugin } from "./table-prefix-plugin";
import { TableSnakeCasePlugin } from "./table-snake-case-plugin";

interface TestDatabase {
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

function createDb(plugins: KyselyPlugin[]): Kysely<TestDatabase> {
  return new Kysely<TestDatabase>({
    dialect: {
      createAdapter: () => new SqliteAdapter(),
      createDriver: () => new DummyDriver(),
      createIntrospector: (db) => new SqliteIntrospector(db),
      createQueryCompiler: () => new SqliteQueryCompiler(),
    },
    plugins,
  });
}

describe("TableSnakeCasePlugin", () => {
  it("should convert camelCase table names in select queries", () => {
    const { sql } = createDb([new TableSnakeCasePlugin()])
      .selectFrom("userOrders")
      .selectAll()
      .compile();

    expect(sql).toBe('select * from "user_orders"');
  });

  it("should convert camelCase table names in insert queries", () => {
    const { sql } = createDb([new TableSnakeCasePlugin()])
      .insertInto("userOrders")
      .values({ createdAt: "2026-10-20" })
      .compile();

    expect(sql).toBe('insert into "user_orders" ("createdAt") values (?)');
  });

  it("should convert joined table names but keep aliases untouched", () => {
    const { sql } = createDb([new TableSnakeCasePlugin()])
      .selectFrom("userOrders")
      .innerJoin("orderItems as oi", "oi.id", "userOrders.id")
      .select("userOrders.id")
      .compile();

    expect(sql).toBe(
      'select "user_orders"."id" from "user_orders" inner join "order_items" as "oi" on "oi"."id" = "user_orders"."id"',
    );
  });

  it("should convert cte names consistently", () => {
    const { sql } = createDb([new TableSnakeCasePlugin()])
      .with("userOrderItems", (qb) => qb.selectFrom("orderItems").selectAll())
      .selectFrom("userOrderItems")
      .selectAll()
      .compile();

    expect(sql).toBe(
      'with "user_order_items" as (select * from "order_items") select * from "user_order_items"',
    );
  });

  it("should leave column names untouched", () => {
    const { sql } = createDb([new TableSnakeCasePlugin()])
      .selectFrom("userOrders")
      .select(["userOrders.id", "userOrders.createdAt"])
      .compile();

    expect(sql).toBe('select "user_orders"."id", "user_orders"."createdAt" from "user_orders"');
  });

  it("should keep acronyms and digit-adjacent words intact", () => {
    expect(
      createDb([new TableSnakeCasePlugin()]).selectFrom("HTTPServer").selectAll().compile().sql,
    ).toBe('select * from "http_server"');
    expect(
      createDb([new TableSnakeCasePlugin()]).selectFrom("parseJSON").selectAll().compile().sql,
    ).toBe('select * from "parse_json"');
    expect(
      createDb([new TableSnakeCasePlugin()]).selectFrom("user2fa").selectAll().compile().sql,
    ).toBe('select * from "user2fa"');
    expect(
      createDb([new TableSnakeCasePlugin()]).selectFrom("SERVER2").selectAll().compile().sql,
    ).toBe('select * from "server_2"');
  });

  it("should pass already snake_case names through unchanged", () => {
    const db = createDb([new TableSnakeCasePlugin()]) as Kysely<{
      audit_log: { id: Generated<number> };
    }>;
    const { sql } = db.selectFrom("audit_log").selectAll().compile();

    expect(sql).toBe('select * from "audit_log"');
  });

  it("should compose with the prefix plugin applied afterwards", () => {
    const { sql } = createDb([new TableSnakeCasePlugin(), new TablePrefixPlugin("rx_")])
      .selectFrom("userOrders")
      .selectAll()
      .compile();

    expect(sql).toBe('select * from "rx_user_orders"');
  });
});
