import { defineDevConfig } from "@resolid/dev";
import { env } from "node:process";

export const { vitePluginOptions, reactRouterConfig } = defineDevConfig({
  platform: env.VERCEL == 1 ? "vercel" : env.NETLIFY ? "netlify" : "node",
  nodeVersion: env.NETLIFY ? 22 : 24,
  appDirectory: "src",
  reactRouterConfig: {
    serverBundles: ({ branch }) => {
      return branch.some((route) => {
        return route.id.startsWith("portals/admin");
      })
        ? "admin"
        : "site";
    },
    future: {
      v8_middleware: true,
      v8_splitRouteModules: true,
      v8_viteEnvironmentApi: true,
      unstable_optimizeDeps: true,
    },
  },
});
