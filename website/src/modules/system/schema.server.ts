import { int, varchar } from "@resolid/app-db-mysql/drizzle";
import { defineTable } from "~/foundation/schema.server";

export const statusTable = defineTable("status", {
  id: int().primaryKey().autoincrement(),
  message: varchar({ length: 90 }).notNull().default(""),
});
