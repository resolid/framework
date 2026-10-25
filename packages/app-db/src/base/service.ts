import { inject } from "@resolid/app";
import { DatabaseService } from "../core/service";

export abstract class BaseService {
  private readonly _databaseService: DatabaseService;

  constructor(databaseService: DatabaseService = inject(DatabaseService)) {
    this._databaseService = databaseService;
  }

  protected get database(): DatabaseService {
    return this._databaseService;
  }
}
