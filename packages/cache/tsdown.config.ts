import { defineConfig, type UserConfig } from "tsdown";

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  entry: {
    index: "src/index.ts",
    stores: "src/stores.ts",
    utils: "src/utils/index.ts",
    types: "src/types/index.ts",
  },
  format: "esm",
  target: "es2022",
  dts: true,
  treeshake: true,
  clean: true,
  minify: true,
}) as UserConfig;
