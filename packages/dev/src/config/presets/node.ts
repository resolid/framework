import type { Preset } from "@react-router/dev/config";
import type { NodeVersions } from "../../types";
import { buildPreset, type PresetBaseOptions } from "../utils";

export type NodePresetOptions = PresetBaseOptions & {
  nodeVersion: NodeVersions["node"];
};

export const nodePreset = (options?: NodePresetOptions): Preset => {
  const nodeVersion = options?.nodeVersion ?? 22;

  // noinspection JSUnusedGlobalSymbols
  return {
    name: "@resolid/react-router-hono-node-preset",
    reactRouterConfig: () => {
      return {
        buildEnd: async ({ buildManifest, reactRouterConfig, viteConfig }) => {
          await buildPreset({
            includeFiles: options?.includeFiles,
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
