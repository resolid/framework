import {
  DummyDriver,
  Kysely,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type Generated,
} from "kysely";
import { describe, expect, it } from "vitest";
import { TablePrefixPlugin } from "./table-prefix-plugin";

interface TestDatabase {
  user: {
    id: Generated<number>;
    name: string;
  };
}

function createDb(prefix: string): Kysely<TestDatabase> {
  return new Kysely<TestDatabase>({
    dialect: {
      createAdapter: () => new SqliteAdapter(),
      createDriver: () => new DummyDriver(),
      createIntrospector: (db) => new SqliteIntrospector(db),
      createQueryCompiler: () => new SqliteQueryCompiler(),
    },
    plugins: [new TablePrefixPlugin(prefix)],
  });
}

describe("TablePrefixPlugin", () => {
  it("should prefix table names in select queries", () => {
    const { sql } = createDb("rx_").selectFrom("user").selectAll().compile();

    expect(sql).toBe('select * from "rx_user"');
  });

  it("should prefix table names in insert queries", () => {
    const { sql } = createDb("rx_").insertInto("user").values({ name: "resolid" }).compile();

    expect(sql).toBe('insert into "rx_user" ("name") values (?)');
  });

  it("should prefix table names in schema builders", () => {
    const { sql } = createDb("rx_")
      .schema.createTable("user")
      .addColumn("id", "integer")
      .addColumn("name", "text")
      .compile();

    expect(sql).toBe('create table "rx_user" ("id" integer, "name" text)');
  });

  it("should leave table names untouched for an empty prefix", () => {
    const { sql } = createDb("").selectFrom("user").selectAll().compile();

    expect(sql).toBe('select * from "user"');
  });
});
