import type { Kysely, Insertable, Selectable } from "kysely";
import type { DatabaseExecutor } from "../core/types";

export async function insertOne<DB, T extends keyof DB & string>(
  db: DatabaseExecutor<DB>,
  table: T,
  values: Insertable<DB[T]>,
  pk = "id",
): Promise<Selectable<DB[T]>> {
  // oxlint-disable-next-line typescript/no-explicit-any
  const k = db as unknown as Kysely<any>;
  const { adapter } = k.getExecutor();

  const query = k.insertInto(table).values(values);

  if (adapter.supportsReturning) {
    return (await query.returningAll().executeTakeFirstOrThrow()) as Selectable<DB[T]>;
  }

  if (adapter.supportsOutput) {
    return (await query.outputAll("inserted").executeTakeFirstOrThrow()) as Selectable<DB[T]>;
  }

  const { insertId } = await query.executeTakeFirstOrThrow();
  const id = insertId && insertId > 0n ? insertId : (values as Record<string, unknown>)[pk];

  return (await k
    .selectFrom(table)
    .selectAll()
    .where(db.dynamic.ref(pk), "=", id)
    .executeTakeFirstOrThrow()) as Selectable<DB[T]>;
}
