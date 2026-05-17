import { defineConfig, type ViteUserConfig } from "vitest/config";

const config: ViteUserConfig = defineConfig({
  test: {
    dir: "./src",
    coverage: {
      enabled: true,
    },
    globalSetup: "./vitest.global-setup.ts",
  },
});

export default config;
