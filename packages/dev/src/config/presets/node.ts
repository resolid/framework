import type { Preset } from "@react-router/dev/config";
import { buildPreset, type PresetBaseOptions } from "../utils";

type NodePresetOptions = PresetBaseOptions;

export function nodePreset({ nodeVersion, includeFiles }: NodePresetOptions): Preset {
  return {
    name: "@resolid/react-router-hono-node-preset",
    reactRouterConfig() {
      return {
        async buildEnd({ buildManifest, reactRouterConfig, viteConfig }) {
          await buildPreset({
            includeFiles,
            nodeVersion,
            buildManifest,
            reactRouterConfig,
            viteConfig,
            buildStart() {
              console.log("Bundle Node Server for production...");
            },
          });
        },
      };
    },
  };
}
