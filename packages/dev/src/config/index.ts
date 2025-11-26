import type { Config } from "@react-router/dev/config";
import type { NodeVersion, Platform } from "../types";
import { netlifyPreset } from "./presets/netlify";
import { nodePreset } from "./presets/node";
import { vercelPreset } from "./presets/vercel";

export type VitePluginOptions = {
  platform: Platform;
  nodeVersion: NodeVersion;
  entryFile: string;
  devExclude?: (string | RegExp)[];
};

export type ReactRouterConfig = Omit<Config, "appDirectory" | "ssr">;

export type DevConfigOptions = Partial<VitePluginOptions> & {
  appDirectory?: string;
  includeFiles?: string[];
  reactRouterConfig?: ReactRouterConfig;
};

export type DevConfig = {
  vitePluginOptions: VitePluginOptions;
  reactRouterConfig: Config;
};

export const defineDevConfig = ({
  platform = "node",
  nodeVersion = 22,
  entryFile = "server.ts",
  appDirectory = "src",
  includeFiles = [],
  reactRouterConfig,
  devExclude,
}: DevConfigOptions): DevConfig => {
  const presetDefine =
    platform == "netlify" ? netlifyPreset : platform == "vercel" ? vercelPreset : nodePreset;

  const preset = presetDefine({ nodeVersion, includeFiles });

  return {
    vitePluginOptions: {
      platform,
      nodeVersion,
      entryFile,
      devExclude,
    },
    reactRouterConfig: {
      ...reactRouterConfig,
      appDirectory,
      ssr: true,
      presets: reactRouterConfig?.presets ? [...reactRouterConfig.presets, preset] : [preset],
    },
  };
};
