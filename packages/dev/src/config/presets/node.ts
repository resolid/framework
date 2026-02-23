import type { Preset } from "@react-router/dev/config";
import { buildPreset, type PresetBaseOptions } from "../utils";

type NodePresetOptions = PresetBaseOptions;

export const nodePreset = (options: NodePresetOptions): Preset => {
  const nodeVersion = options.nodeVersion;

  return {
    name: "@resolid/react-router-hono-node-preset",
    reactRouterConfig: () => {
      return {
        buildEnd: async ({ buildManifest, reactRouterConfig, viteConfig }) => {
          await buildPreset({
            includeFiles: options.includeFiles,
            nodeVersion,
            buildManifest,
            reactRouterConfig,
            viteConfig,
            buildStart: async () => {
              console.log("Bundle Node Server for production...");
            },
          });
        },
      };
    },
  };
};
