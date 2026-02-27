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
- `resolidVite` (`@resolid/dev/vite`): combine Resolid plugin behavior with React Router Vite plugin.
- Route helpers (`@resolid/dev/routes`): `relativeFactory`, `prefix`, `route`, `layout`, `index`.
- Router helpers (`@resolid/dev/router`): `mergeMeta`.
- Server-side router helpers (`@resolid/dev/router.server`):
  `createRequestIdMiddleware`, `httpNotFound`, `getClientIp`, `getRequestOrigin`.
- Server adapters (`@resolid/dev/server`): `createServer`, `nodeConfig`, `netlifyConfig`, `vercelConfig`.


## Usage patterns (same as website)

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

## License

MIT License (MIT). Please see [LICENSE](./LICENSE) for more information.
