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
      "@resolid/di": resolve(import.meta.dirname, "../di/src"),
      "@resolid/event": resolve(import.meta.dirname, "../event/src"),
    },
  },
}) as ViteUserConfig;
