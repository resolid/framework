import type { Emitter } from "@resolid/app";
import type { Logger } from "kysely";

export interface AppDbEvents {
  "db:query": [name: string, query: string, duration: number];
  "db:error": [name: string, message: string];
}

const consoleLogger: Logger = (event) => {
  if (event.level === "query") {
    console.log(`db:query: ${event.query.sql}`);
  } else {
    console.error(
      `db:error: ${event.error instanceof Error ? event.error.stack : String(event.error)}`,
    );
  }
};

export function createLoggerFactory(
  emitter: Emitter<AppDbEvents>,
  defaultLogger?: boolean | Logger,
) {
  return (name: string, logger: boolean | Logger | undefined = defaultLogger): Logger => {
    const sink = typeof logger === "function" ? logger : logger ? consoleLogger : undefined;

    return (event) => {
      if (event.level === "query") {
        emitter.emit("db:query", name, event.query.sql, event.queryDurationMillis);
      } else {
        emitter.emit(
          "db:error",
          name,
          event.error instanceof Error ? event.error.message : String(event.error),
        );
      }

      void sink?.(event);
    };
  };
}
