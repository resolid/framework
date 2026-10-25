/**
 * App-wide Kysely database schema.
 *
 * Modules (and published packages) declare their own table types and merge
 * them into this interface through module augmentation, so the whole database
 * schema is assembled automatically without a central registration file:
 *
 * ```ts
 * import type { Generated } from "kysely";
 *
 * export interface StatusTable {
 *   id: Generated<number>;
 *   message: string;
 * }
 *
 * declare module "@resolid/app-db" {
 *   interface Database {
 *     status: StatusTable;
 *   }
 * }
 * ```
 */

// oxlint-disable-next-line typescript/no-empty-object-type
export interface Database {}
