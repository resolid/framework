import { int, varchar } from "@resolid/app-db/adapters/mysql";
import { defineMySqlTable } from "~/foundation/schema.server";

export const statusTable = defineMySqlTable("status", {
  id: int().primaryKey().autoincrement(),
  message: varchar({ length: 90 }).notNull().default(""),
});
