import { Repository } from "@resolid/app-db-mysql";
import { statusTable } from "./schema.server";

export class SystemRepository extends Repository {
  async getFirst() {
    const status = await this.db.select().from(statusTable).limit(1);

    return status.length > 0 ? status[0] : undefined;
  }
}
