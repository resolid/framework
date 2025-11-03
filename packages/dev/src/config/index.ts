import type { Config } from "@react-router/dev/config";
import type { NodeVersions, Platform } from "../types";
import { netlifyPreset } from "./presets/netlify";
import { nodePreset } from "./presets/node";
import { vercelPreset } from "./presets/vercel";

export type VitePluginOptions = {
  platform: Platform["platform"];
  nodeVersion: NodeVersions["node"];
  entryFile: string;
  devExclude?: (string | RegExp)[];
};

export type ReactRouterConfig = Omit<Config, "appDirectory" | "ssr">;

export type DevConfigOptions = Platform & {
  entryFile?: string;
  appDirectory?: string;
  includeFiles?: string[];
  reactRouterConfig?: ReactRouterConfig;
  devExclude?: (string | RegExp)[];
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
  const preset =
    platform == "netlify"
      ? netlifyPreset({
          nodeVersion: nodeVersion as NodeVersions["netlify"],
          includeFiles,
        })
      : platform == "vercel"
        ? vercelPreset({
            nodeVersion: nodeVersion as NodeVersions["vercel"],
            includeFiles,
          })
        : nodePreset({
            nodeVersion: nodeVersion,
            includeFiles,
          });

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
