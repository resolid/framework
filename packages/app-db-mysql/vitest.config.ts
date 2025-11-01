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
      "@resolid/app-db": resolve(import.meta.dirname, "../app-db/src"),
    },
  },
}) as ViteUserConfig;
