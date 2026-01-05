import { defineConfig, type UserConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    stores: "src/stores.ts",
  },
  format: "esm",
  target: "es2022",
  dts: true,
  treeshake: true,
  clean: true,
  minify: true,
}) as UserConfig;
