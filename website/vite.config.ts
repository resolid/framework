import { resolidVite } from "@resolid/dev/vite";
import rolldownBabel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { reactCompilerPreset } from "@vitejs/plugin-react";
import nodePath from "node:path";
import { type AliasOptions, defineConfig, type UserConfig } from "vite";
import { vitePluginOptions } from "./resolid.config";

export default defineConfig(({ command }) => {
  const isBuild = command == "build";

  return {
    plugins: [
      resolidVite(vitePluginOptions),
      tailwindcss(),
      rolldownBabel({ presets: [reactCompilerPreset()] }),
    ],
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              // oxlint-disable-next-line prefer-named-capture-group
              { name: "react", test: /node_modules[\\/](react|react-dom|react-is|scheduler)[\\/]/ },
              {
                name: "react-router",
                // oxlint-disable-next-line prefer-named-capture-group
                test: /node_modules[\\/](@react-router|react-router)[\\/]/,
              },
              {
                name: "components",
                // oxlint-disable-next-line prefer-named-capture-group
                test: /src[\\/]components[\\/](history-link|error-component|sprite-icon)\.tsx/,
              },
            ],
          },
        },
      },
    },
    resolve: {
      tsconfigPaths: !isBuild,
      alias: [
        isBuild && { find: "~", replacement: nodePath.join(import.meta.dirname, "./src") },
      ].filter(Boolean) as AliasOptions,
    },
  } satisfies UserConfig;
});
