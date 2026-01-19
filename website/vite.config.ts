import { resolidVite } from "@resolid/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { extname, join } from "node:path";
import { type AliasOptions, defineConfig, type Plugin, type UserConfig } from "vite";
import { analyzer } from "vite-bundle-analyzer";
import viteBabel from "vite-plugin-babel";
import viteInspect from "vite-plugin-inspect";
import tsconfigPaths from "vite-tsconfig-paths";

import { vitePluginOptions } from "./resolid.config";

export default defineConfig(({ command }) => {
  const isBuild = command == "build";
  const enableAnalyzer = false;

  return {
    plugins: [
      resolidVite(vitePluginOptions),
      tailwindcss(),
      viteBabel({
        filter: /\.[jt]sx?$/,
        babelConfig: {
          compact: false,
          babelrc: false,
          configFile: false,
          presets: ["@babel/preset-typescript"],
          plugins: [
            [
              "babel-plugin-react-compiler",
              {
                target: "19",
              },
            ],
          ],
        },
        loader: (path) => {
          return extname(path).substring(1) as "js" | "jsx";
        },
      }),
      {
        ...analyzer({ enabled: enableAnalyzer }),
        applyToEnvironment(env) {
          return env.name == "client";
        },
      } as Plugin,
      !isBuild && tsconfigPaths(),
      !isBuild && viteInspect(),
    ].filter(Boolean),
    environments: {
      ssr: {
        build: {
          rollupOptions: {
            output: {
              manualChunks: undefined,
            },
            onwarn(warning, warn) {
              if (
                warning.code === "UNUSED_EXTERNAL_IMPORT" &&
                warning.message.includes("react/jsx-runtime")
              ) {
                return;
              }
              warn(warning);
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

            if (
              id.includes("/node_modules/@react-router/") ||
              id.includes("/node_modules/react-router/")
            ) {
              return "react-router";
            }

            if (
              id.includes("src/components/history-link.tsx") ||
              id.includes("src/components/error-component.tsx") ||
              id.includes("src/components/sprite-icon.tsx")
            ) {
              return "components";
            }
          },
        },
      },
    },
    ssr: {
      external: ["mysql2"],
    },
    resolve: {
      alias: [isBuild && { find: "~", replacement: join(__dirname, "./src") }].filter(
        Boolean,
      ) as AliasOptions,
    },
  } satisfies UserConfig;
});
