import type { Generated, Selectable } from "kysely";

export interface StatusTable {
  id: Generated<number>;
  message: string;
}

declare module "@resolid/app-db" {
  interface Database {
    status: StatusTable;
  }
}

export type Status = Selectable<StatusTable>;
