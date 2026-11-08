import { defineDevConfig } from "@resolid/dev";

export const { vitePluginOptions, reactRouterConfig } = defineDevConfig({
  appDirectory: "src",
  nodeVersion: 26,
  platform: "node",
  reactRouterConfig: {
    future: {
      unstable_optimizeDeps: true,
    },
    serverBundles: ({ branch }) =>
      branch.some((route) => route.id.startsWith("portals/admin")) ? "admin" : "site",
  },
});
