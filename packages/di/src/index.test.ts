import { beforeEach, describe, expect, it } from "vitest";
import { Container, inject } from "./index";
import { toString } from "./shared";

describe("DI Container", () => {
  const TEST_TOKEN = Symbol("TEST");

  class LogService {
    public instanceId = Math.random();

    log(message: string): void {
      console.log(`[Logger ${this.instanceId}]: ${message}`);
    }
  }

  class UserService {
    private readonly logger: LogService;

    constructor(logger: LogService) {
      this.logger = logger;
    }

    getLogger(): LogService {
      return this.logger;
    }
  }

  class AnalyticsService {
    private readonly logger?: LogService;

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

    hasLogger(): boolean {
      return !!this.logger;
    }
  }

  class ReportService {
    private readonly getLogger: () => LogService;

    constructor(getLogger: () => LogService) {
      this.getLogger = getLogger;
    }

    async generateReport(): Promise<string> {
      const logger = this.getLogger();

      logger.log("Report generated");

      return "Report generated";
    }
  }

  class DatabaseService {
    private connected = false;

    async connect(): Promise<void> {
      await new Promise((resolve) => setTimeout(resolve, 100));
      this.connected = true;
    }

    isConnected(): boolean {
      return this.connected;
    }

    async dispose(): Promise<void> {
      await new Promise((resolve) => setTimeout(resolve, 50));
      this.connected = false;
    }
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  describe("Basic functionality", () => {
    it("should be able to register and resolve simple dependencies", () => {
      container.add({
        token: TEST_TOKEN,
        factory: () => "TEST_TOKEN",
      });

      const token = container.get(TEST_TOKEN);
      expect(token).toBe("TEST_TOKEN");
    });

    it("should be able to use Class as Token", () => {
      container.add({
        token: LogService,
        factory: () => new LogService(),
      });

      const logger = container.get(LogService);
      expect(logger).toBeInstanceOf(LogService);
    });

    it("should throw an error when dependency does not exist", () => {
      expect(() => container.get(TEST_TOKEN)).toThrow("No provider found");
      expect(() => container.get(LogService)).toThrow("No provider found");
    });

    it("inject should return undefined when called without context but optional", () => {
      const result = inject(TEST_TOKEN, { optional: true });
      expect(result).toBeUndefined();
    });

    it("inject should throw an error when called without context", () => {
      expect(() => inject(TEST_TOKEN)).toThrow(
        "inject() must be called within a injection context",
      );
    });
  });

  describe("Scope", () => {
    it("singleton should return the same instance", () => {
      container.add({
        token: LogService,
        factory: () => new LogService(),
      });

      const log1 = container.get(LogService);
      const log2 = container.get(LogService);

      expect(log1).toBe(log2);
      expect(log1.instanceId).toBe(log2.instanceId);
    });

    it("transient should return a new instance each time", () => {
      container.add({
        token: LogService,
        factory: () => new LogService(),
        scope: "transient",
      });

      const log1 = container.get(LogService);
      const log2 = container.get(LogService);

      expect(log1).not.toBe(log2);
      expect(log1.instanceId).not.toBe(log2.instanceId);
    });
  });

  describe("Dependency injection", () => {
    it("should be able to inject dependencies into other services", () => {
      container.add({
        token: LogService,
        factory: () => new LogService(),
      });

      container.add({
        token: UserService,
        factory: () => new UserService(inject(LogService)),
      });

      const userService = container.get(UserService);
      expect(userService).toBeInstanceOf(UserService);
      expect(userService.getLogger()).toBeInstanceOf(LogService);
    });
  });

  describe("Optional dependencies", () => {
    it("when optional is true, non-existent dependencies should return undefined", () => {
      const result = container.get(LogService, { optional: true });
      expect(result).toBeUndefined();
    });

    it("should be able to use optional dependencies in factories", () => {
      container.add({
        token: AnalyticsService,
        factory: () => new AnalyticsService(inject(LogService, { optional: true })),
      });

      const analytics = container.get(AnalyticsService);

      expect(analytics.hasLogger()).toBe(false);
      analytics.track("page_view");
    });

    it("optional dependencies should inject normally when they exist", () => {
      container.add({
        token: LogService,
        factory: () => new LogService(),
      });

      container.add({
        token: AnalyticsService,
        factory: () => new AnalyticsService(inject(LogService, { optional: true })),
      });

      const analytics = container.get(AnalyticsService);

      expect(analytics.hasLogger()).toBe(true);
    });

    it("lazy + optional combination should return a function", () => {
      container.add({
        token: UserService,
        factory: () => {
          const getDb = inject(DatabaseService, { lazy: true, optional: true });

          expect(typeof getDb).toBe("function");

          const db = getDb();

          expect(db).toBeUndefined();

          return {};
        },
      });

      container.get(UserService);
    });
  });

  describe("Lazy loading", () => {
    it("lazy should return a function", () => {
      container.add({
        token: LogService,
        factory: () => new LogService(),
      });

      const getLogger = container.get(LogService, { lazy: true });

      expect(typeof getLogger).toBe("function");

      const logger = getLogger();

      expect(logger).toBeInstanceOf(LogService);
    });

    it("should be able to use lazy dependencies in factories", async () => {
      container.add({
        token: LogService,
        factory: () => new LogService(),
      });

      container.add({
        token: ReportService,
        factory: () => new ReportService(inject(LogService, { lazy: true })),
      });

      const reportService = container.get(ReportService);

      const report = await reportService.generateReport();

      expect(report).toBe("Report generated");
    });

    it("lazy + optional combination should work normally", () => {
      const getLogger = container.get(LogService, { lazy: true, optional: true });
      expect(typeof getLogger).toBe("function");
      expect(getLogger()).toBeUndefined();
    });

    it("lazy nested calls should work normally", () => {
      container.add({
        token: LogService,
        factory: () => new LogService(),
      });

      const getLogger1 = container.get(LogService, { lazy: true });
      const getLogger2 = container.get(LogService, { lazy: true });

      const logger1 = getLogger1();
      const logger2 = getLogger2();

      expect(logger1).toBe(logger2);
    });
  });

  describe("Circular dependency detection", () => {
    class ApiService {
      private readonly auth: AuthService;

      constructor(auth: AuthService) {
        this.auth = auth;
      }

      getAuth(): AuthService {
        return this.auth;
      }
    }

    class AuthService {
      private readonly api: ApiService;

      constructor(api: ApiService) {
        this.api = api;
      }

      getApi(): ApiService {
        return this.api;
      }
    }

    it("should detect circular dependencies and throw an error", () => {
      container.add({
        token: ApiService,
        factory: () => new ApiService(inject(AuthService)),
      });

      container.add({
        token: AuthService,
        factory: () => new AuthService(inject(ApiService)),
      });

      expect(() => container.get(ApiService)).toThrow("Circular dependency detected");
    });

    it("error message should contain the circular dependency chain", () => {
      container.add({
        token: ApiService,
        factory: () => new ApiService(inject(AuthService)),
      });

      container.add({
        token: AuthService,
        factory: () => new AuthService(inject(ApiService)),
      });

      try {
        container.get(ApiService);
        expect.fail("Should throw error");
      } catch (error: unknown) {
        expect((error as { message: string }).message).toContain("Api");
        expect((error as { message: string }).message).toContain("Auth");
        expect((error as { message: string }).message).toContain("->");
      }
    });
  });

  describe("Resource disposal", async () => {
    it("should be able to dispose all singleton resources", async () => {
      container.add({
        token: DatabaseService,
        factory: () => new DatabaseService(),
      });

      const db = container.get(DatabaseService);

      await db.connect();

      expect(db.isConnected()).toBe(true);

      await container.dispose();

      expect(db.isConnected()).toBe(false);
    });

    it("dispose errors should be collected and thrown together", async () => {
      const badToken = Symbol("Bad");

      container.add({
        token: badToken,
        factory: () => ({
          dispose: async () => {
            throw new Error("Dispose failed");
          },
        }),
      });

      container.add({
        token: DatabaseService,
        factory: () => new DatabaseService(),
      });

      container.get(badToken);
      container.get(DatabaseService);

      await expect(container.dispose()).rejects.toThrow("Failed to dispose 1 provider(s)");
    });

    it("partial dispose failures should not prevent other resources from being disposed", async () => {
      const badToken = Symbol("Bad");

      container.add({
        token: badToken,
        factory: () => ({
          dispose: async () => {
            throw new Error("Dispose failed");
          },
        }),
      });

      container.add({
        token: DatabaseService,
        factory: () => new DatabaseService(),
      });

      container.get(badToken);
      const db = container.get(DatabaseService);

      try {
        await container.dispose();
      } catch {
        // nothing
      }

      expect(db.isConnected()).toBe(false);
    });
  });

  describe("toString", () => {
    it("should return string representation of symbol without description", () => {
      const token = Symbol();
      const result = toString(token);
      expect(result).toBe("Symbol()");
    });

    it("should handle symbols with empty string description", () => {
      const token = Symbol("");
      const result = toString(token);
      expect(result).toBe("");
    });
  });
});
