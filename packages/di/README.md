# Resolid: DI Container Package

![GitHub License](https://img.shields.io/github/license/resolid/framework)
![NPM Version](https://img.shields.io/npm/v/%40resolid/di)

<b>[Documentation](https://www.resolid.tech/docs/di)</b> | [Framework Bundle](https://github.com/resolid/framework)

## TypeScript Dependency Injection Container

A lightweight, fully-typed Dependency Injection (DI) container for TypeScript.
Supports singleton & transient scopes, lazy resolution, optional dependencies, and disposable resources. Fully functional with async factories
and avoids circular dependency issues.

### Features

- Fully typed with TypeScript, no any.
- Supports singleton and transient scopes.
- Lazy resolution for dependencies.
- Optional dependency resolution.
- Detects circular dependencies.
- Handles disposable instances with dispose() support.
- Fully async-compatible with inject() and injectAsync() functions.
- Context-aware injection with InjectionContext.

### Installation

```shell
pnpm add @resolid/di
# or
npm install @resolid/di
# or
yarn add @resolid/di
# or
bun add @resolid/di
```

### Basic Usage

```typescript
import { Container, inject } from "@resolid/di";

class LogService {
  log(message: string): void {
    console.log(`[LOG]: ${message}`);
  }
}

class UserService {
  private logger: LogService;

  constructor(logger: LogService) {
    this.logger = logger;
  }

  createUser(name: string): void {
    this.logger.log(`Creating user: ${name}`);
  }
}

const container = new Container();

container.add({
  token: LogService,
  factory: () => new LogService(),
});

container.add({
  token: UserService,
  factory: () => new UserService(inject(LogService)),
});

const userService = container.get(USER_SERVICE);

userService.createUser("John Doe"); // Output: [LOG]: Creating user: John Doe
```

### Scopes

The container supports two scopes:

- **singleton** (default): Only one instance is created and shared for all resolutions.
- **transient**: A new instance is created on each resolution.

```typescript
container.add({
  token: LogService,
  factory: () => new LogService(),
  scope: "singleton", // Default scope
});

container.add({
  token: Symbol("REQUEST_ID"),
  factory: () => Math.random(),
  scope: "transient", // New instance each time
});
```

### Asynchronous Dependencies

```typescript
import { Container, injectAsync } from "@resolid/di";

class AsyncDatabaseService {
  async connect(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log("Database connected");
  }
}

class AsyncUserService {
  private db : AsyncDatabaseService

  constructor(db: AsyncDatabaseService) {
    this.db = db;
  }

  async getUser(id: number): Promise<string> {
    return `User ${id}`;
  }
}

const container = new Container();

container.add({
  token: AsyncDatabaseService,
  factory: async () => {
    const db = new AsyncDatabaseService();
    await db.connect();
    return db;
  },
  async: true,
});

container.add({
  token: AsyncUserService,
  factory: async () => {
    const db = await injectAsync(AsyncDatabaseService);
    return new AsyncUserService(db)
  },
  async: true,
});

// Resolve async services
const userService = await container.getAsync(AsyncUserService);
const user = await userService.getUser(1);

console.log(user); // Output: User 1
```

### Optional Dependencies

```typescript
import { Container, inject } from "@resolid/di";

class AnalyticsService {
  private logger?: LogService

  constructor(logger?: LogService) {
    this.logger = logger;
  }

  track(event: string): void {
    if (this.logger) {
      this.logger.log(`Analytics: ${event}`);
    } else {
      console.log(`Analytics (no logger): ${event}`);
    }
  }
}

const container = new Container();

// Logger is optional
container.add({
  token: AnalyticsService,
  factory: () => new AnalyticsService(inject(LOG_SERVICE, { optional: true })),
});

const analytics = container.get(AnalyticsService);
analytics.track("page_view"); // Output: Analytics (no logger): page_view
```

### Lazy Resolution

```typescript
import { Container, inject } from "@resolid/di";

class ReportService {
  private getLogger : () => LogService;

  constructor(private getLogger: () => LogService) {
    this.getLogger = getLogger;
  }

  generateReport(): void {
    const logger = this.getLogger();
    logger.log("Report generated");
  }
}

const container = new Container();

container.add({
  token: LogService,
  factory: () => new LogService(),
});

container.add({
  token: ReportService,
  factory: () => new ReportService(inject(LogService, { lazy: true })),
});

const reportService = container.get(ReportService);
reportService.generateReport(); // Output: [LOG]: Report generated
```

### Circular Dependency Detection

```typescript
class ApiService {
  constructor(private auth: AuthService) {}
}

class AuthService {
  constructor(private api: ApiService) {}
}

const container = new Container();

container.add({
  token: ApiService,
  factory: () => new ApiService(inject(AuthService)),
});

container.add({
  token: AuthService,
  factory: () => new AuthService(inject(ApiService)),
});

container.get(ApiService); // Throws: Circular dependency detected ApiService -> AuthService -> ApiService
```

### Disposable Resources

```typescript
import { Container } from "@resolid/di";

class DatabaseConnection {
  async dispose(): Promise<void> {
    console.log("Database connection closed");
  }
}

const container = new Container();

container.add({
  token: DatabaseConnection,
  factory: async () => new DatabaseConnection(),
  async: true,
});

const db = await container.getAsync(DatabaseConnection);

// Dispose all singleton instances
await container.dispose(); // Output: Database connection closed
```

## License

MIT License (MIT). Please see [LICENSE](./LICENSE) for more information.
