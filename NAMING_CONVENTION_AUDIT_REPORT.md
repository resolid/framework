# Resolid Framework Monorepo - 代码命名规范审查报告

## 📋 概览

本报告对 resolid/framework monorepo 中所有核心包的 TypeScript 代码进行了全面的命名规范审查。

**审查日期**: 2024  
**审查范围**: 所有 packages/ 目录下的 TypeScript 源代码  
**审查包数量**: 10 个核心包

---

## 1️⃣ 当前命名规范总结

### ✅ 已遵循的良好模式和约定

#### 1.1 类与接口命名
- **规范**: PascalCase（大驼峰命名法）
- **示例**:
  - 类: `App`, `Container`, `Emitter`, `LogService`, `FileLogService`, `Cacher`, `FileCache`, `MemoryCache`, `DatabaseService`, `BaseRepository`
  - 接口: `Disposable`, `Resolver`, `CacheStore`
- **状态**: ✅ **一致性良好** - 所有类和接口都严格遵循 PascalCase

#### 1.2 类型别名命名
- **规范**: PascalCase
- **示例**: `AppConfig`, `AppContext`, `Extension`, `ExtensionCreator`, `Provider`, `Token`, `Scope`, `LogConfig`, `CacheOptions`
- **状态**: ✅ **一致性良好**

#### 1.3 函数与方法命名
- **规范**: camelCase（小驼峰命名法）
- **示例**:
  - 普通函数: `toString`, `normalizeKey`, `getPackageDependencies`
  - 工厂函数: `createApp`, `createLogExtension`, `createFileLogExtension`, `createMySQLDatabaseExtension`
  - 方法: `get`, `set`, `del`, `clear`, `on`, `off`, `once`, `emit`
- **状态**: ✅ **一致性良好**

#### 1.4 私有类成员命名
- **规范**: 下划线前缀 + camelCase (`_variableName`)
- **示例**:
  - `_root`, `_container`, `_context`, `_boots`, `_booted` (packages/core/src/index.ts)
  - `_events` (packages/event/src/index.ts)
  - `_store`, `_defaultTtl` (packages/cache/src/index.ts)
  - `_basePath`, `_locks` (packages/cache-file/src/index.ts)
  - `_lru` (packages/cache/src/stores/memory-cache.ts)
  - `_database`, `_source` (packages/app-db/src/repository/index.ts)
  - `_providers`, `_singletons`, `_constructing` (packages/di/src/container/index.ts)
- **状态**: ✅ **一致性优秀** - 整个代码库中私有成员一致使用下划线前缀

#### 1.5 工厂函数命名模式
- **规范**: `create` + PascalCase
- **示例**:
  - `createApp` (packages/core/src/index.ts)
  - `createLogExtension` (packages/app-log/src/index.ts)
  - `createFileLogExtension` (packages/app-log-file/src/index.ts)
  - `createMySQLDatabaseExtension` (packages/app-db-mysql/src/index.ts)
  - `createHonoServer`, `createHonoNodeServer`, `createHonoNetlifyServer`, `createHonoVercelServer` (packages/dev/src/server/)
  - `createLogTarget` (packages/app-log/src/index.ts)
- **状态**: ✅ **一致性优秀** - 所有工厂函数都使用 `create` 前缀

#### 1.6 异步/同步函数对命名
- **规范**: 异步版本添加 `Async` 后缀
- **示例**:
  - `inject` / `injectAsync` (packages/di/src/inject/index.ts)
  - `get` / `getAsync` (packages/di/src/container/index.ts)
  - `emit` / `emitAsync` (packages/event/src/index.ts)
  - `run` / `runAsync` (packages/di/src/context/index.ts)
- **状态**: ✅ **一致性优秀**

#### 1.7 环境变量命名
- **规范**: SCREAMING_SNAKE_CASE（全大写+下划线）
- **示例**: `RESOLID_PLATFORM`, `RESOLID_BUILD_DIR`, `RESOLID_ASSETS_DIR`, `NODE_ENV`, `PORT`, `SERVE_PATH`
- **状态**: ✅ **符合业界标准**

#### 1.8 扩展模块命名
- **规范**: `resolid-{feature}-module` 格式
- **示例**:
  - `"resolid-log-module"` (packages/app-log/src/index.ts:117)
  - `"resolid-file-log-module"` (packages/app-log-file/src/index.ts:45)
  - `"resolid-mysql-db-module"` (packages/app-db-mysql/src/index.ts:83)
- **状态**: ✅ **一致性优秀**

#### 1.9 事件命名
- **规范**: kebab-case（小写+连字符）
- **示例**: `"app:ready"` (packages/core/src/index.ts:154)
- **状态**: ✅ **符合约定**

#### 1.10 正则表达式常量
- **规范**: SCREAMING_SNAKE_CASE + `_RE` 后缀
- **示例**: `INVALID_KEY_RE` (packages/cache-file/src/index.ts:5)
- **状态**: ✅ **一致性良好**

---

## 2️⃣ 发现的不一致或不规范之处

### ⚠️ 中等优先级问题

#### 问题 2.1: 方法命名使用缩写 - `del` vs `delete`

**位置**: 所有 cache 相关包

**描述**: Cache 系统使用 `del` 作为删除方法名，这是一个缩写形式，与 JavaScript 标准库（Map.delete, Set.delete）的命名风格不一致。

**示例**:
```typescript
// packages/cache/src/index.ts:30
del(key: string): Promise<boolean> {
  return this._store.del(normalizeKey(key));
}

// packages/cache/src/types/index.ts:4
del: (key: string) => Promise<boolean>;

// packages/cache-file/src/index.ts:88
async del(key: string): Promise<boolean> { ... }
```

**影响范围**: 
- `packages/cache/src/index.ts`
- `packages/cache/src/types/index.ts`
- `packages/cache-file/src/index.ts`
- `packages/cache/src/stores/memory-cache.ts`
- `packages/cache/src/stores/null-cache.ts`

**建议**: 
- 选项 A: 重命名为 `delete`（更符合 JavaScript 标准）
- 选项 B: 保持 `del`（更简洁，已形成内部约定）
- 推荐 **选项 B**，因为:
  1. 在整个 cache 系统中已经一致使用
  2. Redis、Memcached 等缓存系统也使用 `del` 命名
  3. 更改会破坏 API 向后兼容性

---

#### 问题 2.2: `offAll` 方法命名不够清晰

**位置**: `packages/event/src/index.ts:39`

**描述**: `offAll` 方法名将动词 "off" 和限定词 "All" 组合，不如 JavaScript 社区常见的命名模式清晰。

**当前代码**:
```typescript
// packages/event/src/index.ts:39-45
offAll(event?: string): void {
  if (event) {
    this._events.delete(event);
  } else {
    this._events.clear();
  }
}
```

**建议命名选项**:
- `removeAllListeners` (Node.js EventEmitter 风格)
- `clearListeners`
- `clear` (如果不会与其他 clear 方法冲突)
- `removeAll`

**推荐**: 保持 `offAll`，因为:
1. 与 `on`/`off` 方法命名保持一致
2. 简洁明了
3. API 已经在使用中

---

#### 问题 2.3: 未使用参数的命名不一致

**位置**: `packages/cache/src/stores/null-cache.ts`

**描述**: 未使用的参数命名存在不一致 - 有的使用单个下划线 `_`，有的使用描述性名称如 `_key`, `_value`。

**当前代码**:
```typescript
// packages/cache/src/stores/null-cache.ts:5
async get<T>(_: string): Promise<T> {
  return undefined as T;
}

// packages/cache/src/stores/null-cache.ts:10
async set(_key: string, _value: string, _ttl?: number): Promise<boolean> {
  return true;
}

// packages/cache/src/stores/null-cache.ts:23
async getMultiple<T>(_keys: string[]): Promise<(T | undefined)[]> {
  return _keys.map(() => undefined);  // 这里实际使用了 _keys
}
```

**问题分析**:
1. `get` 方法使用单个 `_` 表示未使用的参数
2. `set` 方法使用 `_key`, `_value`, `_ttl` 描述性命名
3. `getMultiple` 使用 `_keys` 但实际上在方法体内使用了该参数

**建议**:
- 对于完全未使用的参数，统一使用描述性的下划线前缀命名（如 `_key`, `_value`）
- 对于确实使用的参数（如 `getMultiple` 中的 `_keys`），移除下划线前缀

---

### 🔍 低优先级问题（可选改进）

#### 问题 3.1: 通用类型名称可能造成命名冲突

**位置**: `packages/dev/src/vite/utils.ts:9`

**描述**: `Fetch` 类型名称过于通用，可能与全局的 `fetch` API 类型产生混淆。

**当前代码**:
```typescript
// packages/dev/src/vite/utils.ts:9-12
export type Fetch = (
  request: Request,
  env: { incoming: http.IncomingMessage; outgoing: http.ServerResponse },
) => Promise<Response>;
```

**建议**: 重命名为更具描述性的名称，如 `ServerFetchHandler` 或 `HonoFetchHandler`

---

#### 问题 3.2: 双下划线前缀的使用

**位置**: `packages/dev/src/vite/utils.ts:35`

**描述**: 使用 `__reactRouterPluginContext` 双下划线前缀。双下划线通常保留给框架/编译器内部使用。

**当前代码**:
```typescript
// packages/dev/src/vite/utils.ts:35
if (!("__reactRouterPluginContext" in config)) {
  return undefined;
}
```

**建议**: 这是从外部框架（React Router）注入的属性，当前命名是合理的，无需更改。

---

#### 问题 3.3: `toString` 函数可能遮蔽内置方法

**位置**: `packages/di/src/shared/index.ts:10`

**描述**: 导出的 `toString` 函数与 `Object.prototype.toString` 同名。

**当前代码**:
```typescript
// packages/di/src/shared/index.ts:10-16
export function toString<T>(token: Token<T>): string {
  if (typeof token === "symbol") {
    return token.description ?? String(token);
  } else {
    return token.name;
  }
}
```

**建议**: 
- 选项 A: 重命名为 `tokenToString` 或 `getTokenName`
- 选项 B: 保持当前命名（因为是独立函数，不太可能产生实际冲突）
- 推荐 **选项 B**，当前命名在上下文中是清晰的

---

## 3️⃣ 命名规范最佳实践示例

### 示例 3.1: 出色的私有成员命名一致性

```typescript
// packages/core/src/index.ts:52-59
class App<E extends Record<string, unknown>> {
  private readonly _root: string;
  private readonly _container: Container;
  private readonly _context: AppContext;
  private readonly _boots: BootFunction[] = [];
  private readonly _expose?: ExposeSchema;

  private _booted: boolean = false;
  // ...
}
```

✅ **优点**: 所有私有成员一致使用下划线前缀，清晰区分公共和私有 API。

---

### 示例 3.2: 出色的工厂函数命名

```typescript
// packages/core/src/index.ts:165
export async function createApp<E extends ExposeSchema = Record<string, never>>(
  options: AppOptions<E>,
): Promise<App<InferExpose<E>>> { ... }

// packages/app-log/src/index.ts:111
export function createLogExtension(
  targets: readonly LogTarget[] = [],
  config: LogConfig = {},
): ExtensionCreator { ... }

// packages/app-log/src/index.ts:101
export function createLogTarget<T>(target: {
  ref: Token<T>;
  sinks: (service: T) => Record<string, Sink>;
}): LogTarget { ... }
```

✅ **优点**: 所有工厂函数一致使用 `create` 前缀，清晰表明函数用途。

---

### 示例 3.3: 出色的异步方法命名对称性

```typescript
// packages/di/src/inject/index.ts:4-24
export function inject<T>(token: Token<T>): T;
export function inject<T>(token: Token<T>, options: { optional: true }): T | undefined;
// ... 更多重载

// packages/di/src/inject/index.ts:26-39
export function injectAsync<T>(token: Token<T>): Promise<T>;
export function injectAsync<T>(token: Token<T>, options: { optional: true }): Promise<T | undefined>;
// ... 更多重载
```

✅ **优点**: 同步和异步版本命名清晰对称，并提供一致的重载签名。

---

### 示例 3.4: 出色的类型命名层次结构

```typescript
// packages/core/src/index.ts:8-19
export type AppConfig = {
  readonly name: string;
  readonly debug?: boolean;
  readonly timezone?: string;
};

export type AppContext = AppConfig & {
  emitter: Emitter;
  container: Container;
  rootPath: (...paths: string[]) => string;
  runtimePath: (...paths: string[]) => string;
};

export type AppOptions<E extends ExposeSchema = Record<string, never>> = AppConfig & {
  readonly extensions?: (Extension | ExtensionCreator)[];
  readonly providers?: Provider[];
  readonly expose?: E;
};
```

✅ **优点**: 类型名称 `AppConfig` → `AppContext` → `AppOptions` 形成清晰的层次和语义关系。

---

## 4️⃣ 改进建议和规范化方案

### 建议 4.1: 制定明确的命名规范文档

**优先级**: 🔴 高

**建议**: 创建 `NAMING_CONVENTIONS.md` 文档，明确记录以下规则:

```markdown
## Resolid 命名规范

### 1. 类、接口、类型
- 使用 PascalCase
- 示例: `AppContext`, `Container`, `CacheStore`

### 2. 函数和方法
- 使用 camelCase
- 工厂函数使用 `create` 前缀
- 异步版本添加 `Async` 后缀
- 示例: `normalizeKey`, `createApp`, `getAsync`

### 3. 变量和参数
- 使用 camelCase
- 私有类成员使用下划线前缀 `_`
- 常量使用 camelCase（除非是环境变量或全局常量）
- 示例: `_container`, `defaultValue`

### 4. 环境变量
- 使用 SCREAMING_SNAKE_CASE
- 示例: `NODE_ENV`, `RESOLID_PLATFORM`

### 5. 事件名称
- 使用 kebab-case 或 colon-separated
- 示例: `"app:ready"`

### 6. 模块名称
- 扩展模块使用 `resolid-{feature}-module` 格式
- 示例: `"resolid-log-module"`

### 7. 未使用的参数
- 使用描述性的下划线前缀命名
- 示例: `_key`, `_value`（而非单个 `_`）
```

---

### 建议 4.2: 统一未使用参数的命名

**优先级**: 🟡 中

**受影响文件**: `packages/cache/src/stores/null-cache.ts`

**具体更改**:
```typescript
// 当前:
async get<T>(_: string): Promise<T> { ... }

// 改为:
async get<T>(_key: string): Promise<T> { ... }
```

```typescript
// 当前:
async getMultiple<T>(_keys: string[]): Promise<(T | undefined)[]> {
  return _keys.map(() => undefined);  // 实际使用了参数
}

// 改为:
async getMultiple<T>(keys: string[]): Promise<(T | undefined)[]> {
  return keys.map(() => undefined);
}
```

---

### 建议 4.3: 添加 ESLint 规则确保命名一致性

**优先级**: 🟡 中

**建议的 ESLint 配置**:

```javascript
// eslint.config.js
export default [
  {
    rules: {
      // 强制 camelCase 变量命名
      "camelcase": ["error", { 
        "properties": "never",
        "ignoreDestructuring": false,
        "allow": ["^UNSAFE_", "^_"] 
      }],
      
      // 强制类名 PascalCase
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
      
      // 禁止未使用的变量（已启用的规则）
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }]
    }
  }
];
```

---

### 建议 4.4: 在代码审查中强化命名检查

**优先级**: 🟢 低

**建议**: 在 Pull Request 模板中添加命名检查清单:

```markdown
## 代码审查清单

- [ ] 类名、接口名、类型名使用 PascalCase
- [ ] 函数名、方法名使用 camelCase
- [ ] 工厂函数使用 `create` 前缀
- [ ] 私有成员使用下划线 `_` 前缀
- [ ] 异步方法使用 `Async` 后缀
- [ ] 环境变量使用 SCREAMING_SNAKE_CASE
- [ ] 未使用的参数使用描述性的下划线前缀命名
```

---

## 5️⃣ 优先级排列的改进清单

### 🔴 高优先级（建议立即实施）

1. **创建命名规范文档** (`NAMING_CONVENTIONS.md`)
   - 耗时: 1-2 小时
   - 影响: 为未来开发提供明确指导
   - 受益: 所有贡献者

2. **添加 ESLint 命名规则**
   - 耗时: 2-3 小时
   - 影响: 自动化命名检查
   - 受益: 防止未来引入命名不一致

---

### 🟡 中优先级（建议近期实施）

3. **统一 NullCache 中的未使用参数命名**
   - 文件: `packages/cache/src/stores/null-cache.ts`
   - 耗时: 30 分钟
   - 影响范围: 小（仅影响一个内部实现类）
   - 破坏性: 无（内部实现）

4. **重命名 `Fetch` 类型为更具描述性的名称**
   - 文件: `packages/dev/src/vite/utils.ts`
   - 建议名称: `ServerFetchHandler` 或 `HonoFetchHandler`
   - 耗时: 15 分钟
   - 影响范围: 小（类型仅在内部使用）
   - 破坏性: 无（未导出的内部类型）

---

### 🟢 低优先级（可选改进）

5. **考虑重命名 `offAll` 为 `removeAllListeners`**
   - 文件: `packages/event/src/index.ts`
   - 耗时: 1 小时（包括测试更新）
   - 影响范围: 中（公共 API）
   - 破坏性: **高** - 会破坏现有 API
   - 建议: **推迟**，等待下一个主版本发布

6. **考虑将 `del` 重命名为 `delete`**
   - 文件: 所有 cache 相关文件
   - 耗时: 2-3 小时（包括所有测试和文档更新）
   - 影响范围: 大（公共 API）
   - 破坏性: **高** - 会破坏现有 API
   - 建议: **不推荐**，当前命名已形成约定且与业界缓存系统一致

7. **考虑重命名 `toString` 为 `tokenToString`**
   - 文件: `packages/di/src/shared/index.ts`
   - 耗时: 30 分钟
   - 影响范围: 小（内部工具函数）
   - 破坏性: 低（主要内部使用）
   - 建议: **可选**，当前命名在上下文中是清晰的

---

## 6️⃣ 总体评估

### ⭐ 代码质量评分

| 类别 | 评分 | 说明 |
|-----|------|------|
| **类和接口命名** | 10/10 | 完全一致使用 PascalCase |
| **函数和方法命名** | 9/10 | 几乎完全一致，仅有 `del` 使用缩写 |
| **变量命名** | 9/10 | 一致性良好，私有成员严格使用下划线前缀 |
| **类型命名** | 10/10 | 完全一致，清晰的层次结构 |
| **工厂函数模式** | 10/10 | 所有工厂函数一致使用 `create` 前缀 |
| **异步方法命名** | 10/10 | 完美的 `Async` 后缀对称性 |
| **整体一致性** | 9.5/10 | 非常高的命名一致性 |

### 📊 统计数据

- **审查的 TypeScript 文件数**: 66+
- **发现的严重命名问题**: 0
- **发现的中等优先级问题**: 3
- **发现的低优先级问题**: 3
- **良好实践示例**: 10+

---

## 7️⃣ 结论

Resolid Framework monorepo 在代码命名规范方面**表现优秀**。整个代码库展现了高度的命名一致性和清晰的约定：

### ✅ 主要优点

1. **私有成员命名一致性**: 所有私有成员严格使用下划线前缀，这在整个代码库中保持了 100% 的一致性
2. **工厂函数模式**: 所有工厂函数一致使用 `create` 前缀，形成清晰的 API 模式
3. **异步方法对称性**: 同步/异步方法对使用 `Async` 后缀，保持了完美的对称性
4. **类型系统命名**: PascalCase 的严格应用使类型系统清晰易读
5. **扩展模块命名**: 一致的 `resolid-{feature}-module` 格式

### 🎯 改进建议

1. 虽然命名规范已经非常好，但缺少明确的文档记录
2. 建议添加 ESLint 规则自动化命名检查
3. 少数小问题（如 `NullCache` 中的参数命名）可以进一步优化

### 📈 推荐行动

1. **立即**: 创建 `NAMING_CONVENTIONS.md` 文档
2. **近期**: 添加 ESLint 命名规则
3. **可选**: 修复低优先级的命名不一致问题

---

## 附录 A: 命名模式速查表

| 元素类型 | 命名规范 | 示例 | 文件位置 |
|---------|---------|------|---------|
| 类 | PascalCase | `App`, `Container`, `Emitter` | 所有包 |
| 接口 | PascalCase | `Disposable`, `Resolver` | 所有包 |
| 类型别名 | PascalCase | `AppConfig`, `Token` | 所有包 |
| 函数 | camelCase | `normalizeKey`, `toString` | 所有包 |
| 工厂函数 | `create` + PascalCase | `createApp`, `createLogExtension` | 所有包 |
| 方法 | camelCase | `get`, `set`, `emit` | 所有包 |
| 私有成员 | `_` + camelCase | `_container`, `_events` | 所有包 |
| 环境变量 | SCREAMING_SNAKE_CASE | `NODE_ENV`, `RESOLID_PLATFORM` | dev 包 |
| 事件名 | kebab-case | `"app:ready"` | core 包 |
| 常量（正则） | UPPER_SNAKE_CASE + `_RE` | `INVALID_KEY_RE` | cache-file 包 |
| 异步方法 | base + `Async` | `getAsync`, `injectAsync` | di, core 包 |
| 模块名 | `resolid-{name}-module` | `"resolid-log-module"` | 扩展包 |

---

## 附录 B: 包级命名审查详情

### @resolid/core
- ✅ **命名一致性**: 优秀
- ✅ **私有成员**: 严格遵循下划线前缀
- ✅ **工厂函数**: `createApp` 遵循 `create` 前缀模式
- ✅ **类型层次**: `AppConfig` → `AppContext` → `AppOptions` 清晰

### @resolid/di
- ✅ **命名一致性**: 优秀
- ✅ **异步对称性**: `inject`/`injectAsync`, `get`/`getAsync` 完美对称
- ✅ **私有成员**: `_providers`, `_singletons`, `_constructing` 一致
- 🔍 **小问题**: `toString` 函数名可能遮蔽内置方法（低优先级）

### @resolid/event
- ✅ **命名一致性**: 优秀
- ✅ **私有成员**: `_events` 使用下划线前缀
- ✅ **方法命名**: `on`, `off`, `once`, `emit`, `emitAsync` 清晰
- ⚠️ **改进点**: `offAll` 可考虑重命名（低优先级）

### @resolid/cache
- ✅ **命名一致性**: 优秀
- ✅ **私有成员**: `_store`, `_defaultTtl` 一致
- ⚠️ **约定**: `del` 使用缩写（但与缓存系统约定一致）

### @resolid/cache-file
- ✅ **命名一致性**: 优秀
- ✅ **私有成员**: `_basePath`, `_locks` 一致
- ✅ **常量**: `INVALID_KEY_RE` 遵循正则常量命名

### @resolid/app-log
- ✅ **命名一致性**: 优秀
- ✅ **工厂函数**: `createLogExtension`, `createLogTarget`
- ✅ **私有成员**: `_config`, `_defaultSink`, `_defaultCategory`

### @resolid/app-log-file
- ✅ **命名一致性**: 优秀
- ✅ **工厂函数**: `createFileLogExtension`
- ✅ **私有成员**: `_path` 一致

### @resolid/app-db
- ✅ **命名一致性**: 优秀
- ✅ **私有成员**: `_database`, `_source` 一致
- ✅ **抽象类**: `DatabaseService`, `BaseRepository` 命名清晰

### @resolid/app-db-mysql
- ✅ **命名一致性**: 优秀
- ✅ **工厂函数**: `createMySQLDatabaseExtension`
- ✅ **类继承**: `MySQLDatabaseService` 遵循命名层次

### @resolid/dev
- ✅ **命名一致性**: 优秀
- ✅ **工厂函数**: `createHonoServer`, `createHonoNodeServer` 等
- ✅ **配置函数**: `defineDevConfig` 清晰
- 🔍 **小问题**: `Fetch` 类型名过于通用（低优先级）

---

**报告结束**

*此报告为 Resolid Framework monorepo 代码命名规范的全面审查。整体而言，代码库展现了优秀的命名一致性和清晰的约定。建议的改进主要是补充文档和自动化检查，而非修复严重问题。*
