import type { Provider } from "@resolid/core";
import { SystemRepository } from "~/modules/system/repository.server";

export const serviceProvider: Provider = {
  token: SystemRepository,
  factory() {
    return new SystemRepository();
  },
};
