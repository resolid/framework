import { Repository } from "@resolid/app-db-mysql";
import type { Provider } from "@resolid/core";
import { app } from "~/app";
import { statusTable } from "./schema.server";

class SystemRepository extends Repository {
  async getFirst() {
    const status = await this.db.select().from(statusTable).limit(1);

    return status.length > 0 ? status[0] : undefined;
  }
}

export function systemRepository() {
  return app.get(SystemRepository);
}

export const serviceProvider: Provider = {
  token: SystemRepository,
  factory() {
    return new SystemRepository();
  },
};
