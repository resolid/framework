# Resolid Framework - Naming Conventions Guide

This document establishes the official naming conventions for the Resolid Framework monorepo. All contributors should follow these guidelines to maintain code consistency.

## Table of Contents

- [Classes, Interfaces, and Types](#classes-interfaces-and-types)
- [Functions and Methods](#functions-and-methods)
- [Variables and Parameters](#variables-and-parameters)
- [Constants](#constants)
- [Environment Variables](#environment-variables)
- [Events](#events)
- [Module Names](#module-names)
- [Special Patterns](#special-patterns)

---

## Classes, Interfaces, and Types

**Convention**: Use `PascalCase` (UpperCamelCase)

### ✅ Good Examples

```typescript
// Classes
class App { }
class Container { }
class LogService { }
class FileCache { }
class DatabaseService { }

// Interfaces
interface Disposable { }
interface Resolver { }
interface CacheStore { }

// Type Aliases
type AppConfig = { };
type Token<T> = symbol | (new (...args: any[]) => T);
type Provider<T> = { };
```

### ❌ Bad Examples

```typescript
// Don't use camelCase
class appContainer { }
interface logService { }
type app_config = { };

// Don't use snake_case
class app_container { }
interface log_service { }
```

---

## Functions and Methods

**Convention**: Use `camelCase`

### Factory Functions

Factory functions should use the `create` prefix followed by the thing being created.

```typescript
// ✅ Good
export function createApp(options: AppOptions): Promise<App> { }
export function createLogExtension(config: LogConfig): ExtensionCreator { }
export function createHonoServer(options: ServerOptions): Promise<Hono> { }

// ❌ Bad
export function newApp(options: AppOptions): Promise<App> { }
export function makeLogExtension(config: LogConfig): ExtensionCreator { }
export function buildServer(options: ServerOptions): Promise<Hono> { }
```

### Async/Sync Pairs

When you have both synchronous and asynchronous versions of a function/method, add the `Async` suffix to the async version.

```typescript
// ✅ Good
export function inject<T>(token: Token<T>): T { }
export function injectAsync<T>(token: Token<T>): Promise<T> { }

class Container {
  get<T>(token: Token<T>): T { }
  getAsync<T>(token: Token<T>): Promise<T> { }
}

// ❌ Bad
export function inject<T>(token: Token<T>): T { }
export function injectPromise<T>(token: Token<T>): Promise<T> { }

class Container {
  get<T>(token: Token<T>): T { }
  getPromise<T>(token: Token<T>): Promise<T> { }
}
```

### Regular Functions and Methods

```typescript
// ✅ Good
function normalizeKey(key: string): string { }
function toString<T>(token: Token<T>): string { }

class Emitter {
  on(event: string, callback: Callback): void { }
  off(event: string, callback: Callback): void { }
  emit(event: string, ...args: unknown[]): void { }
}

// ❌ Bad
function NormalizeKey(key: string): string { }
function to_string<T>(token: Token<T>): string { }
```

---

## Variables and Parameters

**Convention**: Use `camelCase`

### Local Variables

```typescript
// ✅ Good
const userName = "John";
let isActive = true;
const defaultValue = null;

// ❌ Bad
const user_name = "John";
let IsActive = true;
const DefaultValue = null;
```

### Private Class Members

Private class members should be prefixed with a single underscore `_`.

```typescript
// ✅ Good
class App {
  private readonly _container: Container;
  private readonly _context: AppContext;
  private _booted: boolean = false;

  constructor() {
    this._container = new Container();
    this._context = { /* ... */ };
  }
}

// ❌ Bad
class App {
  private readonly container: Container;  // Missing underscore
  private readonly __context: AppContext;  // Double underscore (reserved)
  private booted: boolean = false;  // Missing underscore
}
```

### Unused Parameters

For unused parameters (e.g., in interface implementations or event handlers), use a descriptive name with an underscore prefix.

```typescript
// ✅ Good
async set(_key: string, _value: string, _ttl?: number): Promise<boolean> {
  return true;
}

onClick(_event: MouseEvent): void {
  // Handle click without using event
}

// ❌ Bad
async set(_: string, __: string, ___?: number): Promise<boolean> {
  return true;
}

// ⚠️ If you DO use the parameter, remove the underscore
async getMultiple(keys: string[]): Promise<string[]> {
  return keys.map(k => this.get(k));
}
```

---

## Constants

**Convention**: Depends on the constant type

### Regular Constants

Use `camelCase` for most constants.

```typescript
// ✅ Good
const defaultTimeout = 5000;
const maxRetries = 3;
const apiEndpoint = "https://api.example.com";
```

### Regex Constants

Use `SCREAMING_SNAKE_CASE` with an `_RE` suffix for regex patterns.

```typescript
// ✅ Good
const INVALID_KEY_RE = /(\.\/|\.\.\/)/;
const EMAIL_VALIDATION_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ❌ Bad
const invalidKeyRegex = /(\.\/|\.\.\/)/;
const emailValidationPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

---

## Environment Variables

**Convention**: Use `SCREAMING_SNAKE_CASE` (all uppercase with underscores)

```typescript
// ✅ Good
process.env.NODE_ENV
process.env.PORT
process.env.DATABASE_URL
import.meta.env.RESOLID_PLATFORM
import.meta.env.RESOLID_BUILD_DIR

// ❌ Bad
process.env.nodeEnv
process.env.Port
import.meta.env.resolidPlatform
```

---

## Events

**Convention**: Use `kebab-case` or `colon-separated` lowercase

```typescript
// ✅ Good
emitter.emit("app:ready");
emitter.on("user:login");
emitter.on("database:connected");

// Also acceptable
emitter.emit("app-ready");
emitter.on("user-login");

// ❌ Bad
emitter.emit("appReady");
emitter.on("UserLogin");
emitter.on("DATABASE_CONNECTED");
```

---

## Module Names

### Extension Modules

Extension modules should follow the pattern: `resolid-{feature}-module`

```typescript
// ✅ Good
{
  name: "resolid-log-module",
  providers: [...]
}

{
  name: "resolid-mysql-db-module",
  providers: [...]
}

// ❌ Bad
{
  name: "log-extension",
  providers: [...]
}

{
  name: "MySQLModule",
  providers: [...]
}
```

---

## Special Patterns

### Configuration Functions

Configuration definition functions should use the `define` prefix.

```typescript
// ✅ Good
export function defineDevConfig(options: DevConfigOptions): DevConfig { }
export function defineRoutes(routes: Route[]): RouteConfig { }

// ❌ Bad
export function devConfig(options: DevConfigOptions): DevConfig { }
export function routes(routes: Route[]): RouteConfig { }
```

### Platform-Specific Functions

Platform configuration functions should use the platform name as a prefix.

```typescript
// ✅ Good
export const nodeConfig: PlatformConfig<HonoNodeServerOptions> = (config) => config;
export const netlifyConfig: PlatformConfig<HonoNetlifyServerOptions> = (config) => config;
export const vercelConfig: PlatformConfig<HonoVercelServerOptions> = (config) => config;
```

### Type Utilities

Generic type utilities should be descriptive and use `PascalCase`.

```typescript
// ✅ Good
type InferExpose<E extends ExposeSchema> = { /* ... */ };
type OptionalToUndefined<T> = { /* ... */ };

// ❌ Bad
type Infer<E> = { /* ... */ };  // Too generic
type optional_to_undefined<T> = { /* ... */ };  // Wrong case
```

---

## ESLint Configuration

To enforce these conventions, add the following to your ESLint configuration:

```javascript
export default [
  {
    rules: {
      "camelcase": ["error", { 
        "properties": "never",
        "ignoreDestructuring": false,
        "allow": ["^UNSAFE_", "^_"] 
      }],
      
      "@typescript-eslint/naming-convention": [
        "error",
        {
          "selector": "class",
          "format": ["PascalCase"]
        },
        {
          "selector": "interface",
          "format": ["PascalCase"]
        },
        {
          "selector": "typeAlias",
          "format": ["PascalCase"]
        },
        {
          "selector": "enum",
          "format": ["PascalCase"]
        },
        {
          "selector": "variable",
          "format": ["camelCase", "UPPER_CASE", "PascalCase"],
          "leadingUnderscore": "allow"
        },
        {
          "selector": "function",
          "format": ["camelCase", "PascalCase"]
        },
        {
          "selector": "parameter",
          "format": ["camelCase"],
          "leadingUnderscore": "allow"
        },
        {
          "selector": "memberLike",
          "modifiers": ["private"],
          "format": ["camelCase"],
          "leadingUnderscore": "require"
        }
      ],
      
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }]
    }
  }
];
```

---

## Quick Reference

| Element | Convention | Example |
|---------|-----------|---------|
| Class | PascalCase | `App`, `Container` |
| Interface | PascalCase | `Disposable`, `Resolver` |
| Type | PascalCase | `AppConfig`, `Token<T>` |
| Function | camelCase | `normalizeKey()` |
| Factory Function | `create` + PascalCase | `createApp()` |
| Method | camelCase | `get()`, `set()` |
| Private Member | `_` + camelCase | `_container`, `_events` |
| Variable | camelCase | `userName`, `isActive` |
| Constant | camelCase | `defaultTimeout` |
| Regex Constant | UPPER_SNAKE_CASE + `_RE` | `INVALID_KEY_RE` |
| Environment Variable | SCREAMING_SNAKE_CASE | `NODE_ENV`, `PORT` |
| Event Name | kebab-case | `"app:ready"` |
| Async Method | base + `Async` | `getAsync()` |
| Module Name | `resolid-{name}-module` | `"resolid-log-module"` |

---

## Code Review Checklist

When reviewing code, verify:

- [ ] Class, interface, and type names use PascalCase
- [ ] Function and method names use camelCase
- [ ] Factory functions use `create` prefix
- [ ] Private members use underscore `_` prefix
- [ ] Async methods use `Async` suffix
- [ ] Environment variables use SCREAMING_SNAKE_CASE
- [ ] Unused parameters use descriptive underscore-prefixed names
- [ ] Event names use kebab-case or colon-separated format
- [ ] Extension modules follow `resolid-{name}-module` pattern

---

**Note**: These conventions are based on analysis of the existing codebase and align with TypeScript/JavaScript community best practices. When in doubt, refer to existing code in the monorepo as examples.
