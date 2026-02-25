import type { DrizzleConfig } from "drizzle-orm";
import { LogService } from "@resolid/app-log";
import { type Emitter, inject } from "@resolid/core";

export type DatabaseConfig<S extends Record<string, unknown>, C = unknown> = (
  | { connections: { name?: string; config: C }[]; connection?: never }
  | { connection: C; connections?: never }
) & {
  drizzle?: DrizzleConfig<S>;
};

export abstract class DatabaseService<
  T = unknown,
  S extends Record<string, unknown> = Record<string, never>,
  C extends DatabaseConfig<S> = DatabaseConfig<S>,
> {
  protected readonly config: C;
  protected readonly emitter: Emitter;
  protected readonly logger?: LogService;
  protected readonly connections: Map<string, T> = new Map();

  private readonly _source = "main";

  constructor(
    config: C,
    emitter: Emitter,
    logger: LogService | undefined = inject(LogService, { optional: true }),
  ) {
    this.config = config;
    this.emitter = emitter;
    this.logger = logger;
  }

  abstract connect(): Promise<void> | void;

  abstract close(): Promise<void> | void;

  async dispose(): Promise<Promise<void> | void> {
    await this.close();

    this.connections.clear();
  }

  protected set(connection: T, name: string = this._source): void {
    this.connections.set(name, connection);
  }

  get(name: string = this._source): T {
    const db = this.connections.get(name);

    if (!db) {
      throw new Error(`Connection with name ${name} does not exist.`);
    }

    return db as T;
  }
}
