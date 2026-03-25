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
    },
  },
});

export default config;
