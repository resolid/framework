# Development utils for Resolid applications

![GitHub License](https://img.shields.io/github/license/resolid/framework)
![NPM Version](https://img.shields.io/npm/v/%40resolid/dev)

<b>[Documentation](https://www.resolid.tech/docs/dev)</b> | [Framework Bundle](https://github.com/resolid/framework)

## Installation

```shell
pnpm add @resolid/dev
# or
npm install @resolid/dev
# or
yarn add @resolid/dev
# or
bun add @resolid/dev
```

## What is included

- `defineDevConfig` (`@resolid/dev`): generate unified `vitePluginOptions` and `reactRouterConfig`.
- `resolidVite` (`@resolid/dev/vite`): combine Resolid plugin behavior with React Router Vite
  plugin.
- Route helpers (`@resolid/dev/routes`):`flexRoutes`, `relativeFactory`, `prefix`, `route`,
  `layout`, `index`.
- Router helpers (`@resolid/dev/router`): `mergeMeta`.
- Server-side router helpers (`@resolid/dev/router.server`):
  `createRequestIdMiddleware`, `httpNotFound`, `getClientIp`, `getRequestOrigin`.
- Server adapters (`@resolid/dev/server`): `createServer`, `nodeConfig`, `netlifyConfig`,
  `vercelConfig`.

## Usage patterns

### 1) Central config

```ts
// resolid.config.ts
import { defineDevConfig } from "@resolid/dev";
import { env } from "node:process";

export const { vitePluginOptions, reactRouterConfig } = defineDevConfig({
  appDirectory: "src",
  nodeVersion: 24,
  platform: env.VERCEL == 1 ? "vercel" : env.NETLIFY ? "netlify" : "node",
  reactRouterConfig: {
    future: {
      unstable_optimizeDeps: true,
    },
  },
});
```

### 2) Vite config

```ts
// vite.config.ts
import { resolidVite } from "@resolid/dev/vite";
import { defineConfig } from "vite";
import { vitePluginOptions } from "./resolid.config";

export default defineConfig({
  plugins: [resolidVite(vitePluginOptions)],
});
```

### 3) React Router config

```ts
// react-router.config.ts
import { reactRouterConfig } from "./resolid.config";

export default reactRouterConfig;
```

### 4) Server entry

```ts
// src/server.ts
import { createServer, netlifyConfig, nodeConfig, vercelConfig } from "@resolid/dev/server";

export default await createServer((platform) => {
  switch (platform) {
    case "vercel":
      return vercelConfig({});
    case "netlify":
      return netlifyConfig({});
    default:
      return nodeConfig({});
  }
});
```

### 5) React Router document

Visit: https://reactrouter.com/home

### 6) Flex routes

```ts
// src/routes.ts
import { flexRoutes, type RouteConfig } from "@resolid/dev/routes";

export default flexRoutes() satisfies RouteConfig;
```

#### Router Rules

- Routes are defined and nested using folders, very similar to how HTML files are laid out on the nginx server
- The `_layout` file wraps all downstream routes, which require an `<Outlet />` to render sub-routes
- The `_index` file is the default file for the folder, for example: `/users/_index.tsx` will match `/users`
- Variables are represented by `$` in the file path, for example: `/users/$id/edit.tsx` will match `/users/123/edit`
- Enclosing a route segment in parentheses will make the segment optional, for example: `/($lang)/categories.tsx` will
  match `/categories`, `/zh/categories`
- You can use `[]` to escape special characters in routing conventions, for example: `/make-[$$$]-fast-online.tsx` will
  match `/make-$$$-fast-online`
- Files and folders prefixed with `_` become invisible, allowing folder organization without affecting routing paths,
  for example: `/_legal-pages/privacy-policy.tsx` will match `/ privacy-policy`
- `$.tsx` splash route will match the rest of the URL, including slashes, e.g. `/files/$.tsx` will match `/files`,
  `/files/one`, `/files/one/two`

## License

MIT License (MIT). Please see [LICENSE](./LICENSE) for more information.
