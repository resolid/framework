import { defineConfig, type UserConfig } from "tsdown";

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  entry: {
    index: "src/index.ts",
    drizzle: "src/drizzle.ts",
  },
  format: "esm",
  target: "es2022",
  dts: true,
  treeshake: true,
  clean: true,
  minify: true,
}) as UserConfig;
