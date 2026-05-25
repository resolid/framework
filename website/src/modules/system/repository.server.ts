import { MySqlRepository } from "@resolid/app-db/adapters/mysql";
import { statusTable } from "./schema.server";

export class SystemRepository extends MySqlRepository {
  async getFirst() {
    const status = await this.db.select().from(statusTable).limit(1);

    return status.length > 0 ? status[0] : undefined;
  }
}
