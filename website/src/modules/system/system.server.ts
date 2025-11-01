import { app } from "~/app";
import { SystemRepository } from "./repository.server";

export function systemRepository() {
  return app.get(SystemRepository);
}
