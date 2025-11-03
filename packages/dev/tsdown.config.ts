import { defineConfig, type UserConfig } from "tsdown";

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  entry: {
    index: "src/index.ts",
    routes: "src/routes/index.ts",
    server: "src/server/index.ts",
    vite: "src/vite/index.ts",
  },
  format: "esm",
  target: "es2022",
  dts: true,
  treeshake: true,
  clean: true,
  minify: true,
  external: ["virtual:react-router/server-build"],
}) as UserConfig;
