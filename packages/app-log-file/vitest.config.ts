import { resolve } from "path";
import { defineConfig, type ViteUserConfig } from "vitest/config";

export default defineConfig({
  test: {
    dir: "./src",
    coverage: {
      enabled: true,
    },
  },
  resolve: {
    alias: {
      "@resolid/core": resolve(import.meta.dirname, "../core/src"),
      "@resolid/app-log": resolve(import.meta.dirname, "../app-log/src"),
    },
  },
}) as ViteUserConfig;
