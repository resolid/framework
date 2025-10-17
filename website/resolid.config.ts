import { defineDevConfig } from "@resolid/dev";

export const { vitePluginOptions, reactRouterConfig } = defineDevConfig({
  platform: "node",
  appDirectory: "src",
  reactRouterConfig: {
    future: {
      v8_middleware: true,
      unstable_optimizeDeps: true,
      unstable_splitRouteModules: true,
      unstable_viteEnvironmentApi: true,
    },
  },
});
