import { createMySqlDefineTable } from "@resolid/app-db/adapters/mysql";
import { env } from "node:process";

export const defineMySqlTable = createMySqlDefineTable(env.RX_DB_TABLE_PREFIX);
