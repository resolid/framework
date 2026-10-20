import type { Kysely } from "kysely";
import { inject } from "@resolid/app";
import type { Database } from "./database";
import { DatabaseService } from "./service";

export abstract class Repository<DB = Database> {
  protected source?: string;

  private readonly databaseService: DatabaseService;

  constructor(databaseService: DatabaseService = inject(DatabaseService)) {
    this.databaseService = databaseService;
  }

  protected get db(): Kysely<DB> {
    return this.databaseService.get(this.source);
  }
}
