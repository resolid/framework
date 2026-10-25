import { BaseRepository } from "@resolid/app-db";
import type { Status } from "~/modules/system/schema.server";

export class SystemRepository extends BaseRepository {
  async getFirst(): Promise<Status | undefined> {
    return this.db.selectFrom("status").selectAll().limit(1).executeTakeFirst();
  }
}
