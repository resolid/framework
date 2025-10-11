import { defineConfig, type UserConfig } from "tsdown";

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  entry: "src/index.ts",
  format: "esm",
  platform: "node",
  target: "node22.13",
  dts: true,
  treeshake: true,
  clean: true,
  minify: true,
}) as UserConfig;
