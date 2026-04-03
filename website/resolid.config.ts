import { defineDevConfig } from "@resolid/dev";
import { env } from "node:process";

export const { vitePluginOptions, reactRouterConfig } = defineDevConfig({
  appDirectory: "src",
  nodeVersion: 24,
  platform: env.VERCEL == 1 ? "vercel" : env.NETLIFY ? "netlify" : "node",
  reactRouterConfig: {
    serverBundles: ({ branch }) =>
      branch.some((route) => route.id.startsWith("portals/admin")) ? "admin" : "site",
  },
});
