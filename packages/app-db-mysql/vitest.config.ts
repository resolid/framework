import { resolve } from "path";
import { defineConfig, type ViteUserConfig } from "vitest/config";

const config: ViteUserConfig = defineConfig({
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
});

export default config;
