import { createDefineTable } from "@resolid/app-db-mysql";
import { env } from "node:process";

export const defineTable = createDefineTable(env.RX_DB_TABLE_PREFIX);
