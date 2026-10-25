import type { Insertable, Selectable, Updateable } from "kysely";

declare const columnType: unique symbol;

export interface ColumnDefinition<T> {
  readonly [columnType]: T;
}

export function column<T>(): ColumnDefinition<T> {
  return null as unknown as ColumnDefinition<T>;
}

export type InferTable<C> = {
  [K in keyof C]: C[K] extends ColumnDefinition<infer T> ? T : never;
};

type FilteredData<T extends object, C> = Pick<T, Extract<keyof T, keyof C>>;

export type Table<
  C extends Record<string, ColumnDefinition<unknown>> = Record<string, ColumnDefinition<unknown>>,
> = {
  name: string;
  $infer: InferTable<C>;
  $insert: Insertable<InferTable<C>>;
  $select: Selectable<InferTable<C>>;
  $update: Updateable<InferTable<C>>;
  filterData: <T extends object>(data: T) => FilteredData<T, C>;
};

export function defineTable<const C extends Record<string, ColumnDefinition<unknown>>>(
  name: string,
  columns: C,
): Table<C> {
  return {
    name,
    $infer: undefined as unknown as InferTable<C>,
    $insert: undefined as unknown as Insertable<InferTable<C>>,
    $select: undefined as unknown as Selectable<InferTable<C>>,
    $update: undefined as unknown as Updateable<InferTable<C>>,
    filterData<T extends object>(data: T): FilteredData<T, C> {
      const result: Record<string, unknown> = {};

      for (const key of Object.keys(columns)) {
        if (Object.hasOwn(data, key)) {
          result[key] = (data as Record<string, unknown>)[key];
        }
      }

      return result as FilteredData<T, C>;
    },
  };
}
