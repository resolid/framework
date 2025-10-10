import { defineConfig, type ViteUserConfig } from "vitest/config";

export default defineConfig({
  test: {
    dir: "./src",
    coverage: {
      enabled: true,
    },
  },
}) as ViteUserConfig;
