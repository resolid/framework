import type { Config } from "@react-router/dev/config";
import { netlifyPreset } from "@resolid/react-router-hono/netlify-preset";
import { nodePreset } from "@resolid/react-router-hono/node-preset";
import { vercelPreset } from "@resolid/react-router-hono/vercel-preset";
import type { NodeVersions, Platform } from "../types";

export type VitePluginOptions = {
  platform: Platform["platform"];
  devExclude?: (string | RegExp)[];
};

export type ReactRouterConfig = Omit<Config, "appDirectory" | "ssr">;

export type DevConfigOptions = Platform & {
  devExclude?: (string | RegExp)[];
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
  devExclude,
  appDirectory = "src",
  includeFiles = [],
  reactRouterConfig,
}: DevConfigOptions): DevConfig => {
  const entryFile = "server.ts";

  const preset =
    platform == "netlify"
      ? netlifyPreset({
          entryFile,
          includeFiles,
          nodeVersion: nodeVersion as NodeVersions["netlify"],
        })
      : platform == "vercel"
        ? vercelPreset({
            entryFile,
            includeFiles,
            nodeVersion: nodeVersion as NodeVersions["vercel"],
          })
        : nodePreset({
            entryFile,
            includeFiles,
            nodeVersion: nodeVersion,
          });

  return {
    vitePluginOptions: {
      platform,
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
