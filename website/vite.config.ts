import { resolidVitePlugin } from "@resolid/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type UserConfig } from "vite";
import viteInspect from "vite-plugin-inspect";
import tsconfigPaths from "vite-tsconfig-paths";
import { vitePluginOptions } from "./resolid.config";

export default defineConfig(({ command }) => {
  const isBuild = command == "build";

  return {
    plugins: [resolidVitePlugin(vitePluginOptions), tailwindcss(), tsconfigPaths(), !isBuild && viteInspect()].filter(
      Boolean,
    ),
    environments: {
      ssr: {
        build: {
          rollupOptions: {
            output: {
              manualChunks: undefined,
            },
          },
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (
              id.includes("/node_modules/react/") ||
              id.includes("/node_modules/react-dom/") ||
              id.includes("/node_modules/react-is/") ||
              id.includes("/node_modules/scheduler/")
            ) {
              return "react";
            }
          },
        },
      },
    },
    ssr: {
      external: ["mysql2"],
    },
  } satisfies UserConfig;
});
