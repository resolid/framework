import { defineConfig, type UserConfig } from "tsdown";

const config: UserConfig = defineConfig({
  entry: "src/index.ts",
  format: "esm",
  target: "es2022",
  dts: true,
  treeshake: true,
  clean: true,
  minify: true,
});

export default config;
