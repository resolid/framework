import type { Generated, Selectable } from "kysely";

export interface StatusTable {
  id: Generated<number>;
  message: string;
}

export type Status = Selectable<StatusTable>;

declare module "@resolid/app-db" {
  interface Database {
    status: StatusTable;
  }
}
