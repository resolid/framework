import { defineDevConfig } from "@resolid/dev";
import { env } from "node:process";

export const { vitePluginOptions, reactRouterConfig } = defineDevConfig({
  platform: env.VERCEL == 1 ? "vercel" : env.NETLIFY ? "netlify" : "node",
  appDirectory: "src",
  reactRouterConfig: {
    serverBundles: ({ branch }) => {
      return branch.some((route) => {
        console.info(route.id);
        return route.id.startsWith("portals/admin");
      })
        ? "admin"
        : "site";
    },
    future: {
      v8_middleware: true,
      unstable_optimizeDeps: true,
      unstable_splitRouteModules: true,
      unstable_viteEnvironmentApi: true,
    },
  },
});
