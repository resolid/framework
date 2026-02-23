import { defineConfig, type UserConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    routes: "src/routes/index.ts",
    router: "src/router/index.ts",
    "router.server": "src/router/index.server.ts",
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
