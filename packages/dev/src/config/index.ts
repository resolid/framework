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

export type ReactRouterConfig = Omit<
  Config,
  "appDirectory" | "ssr" | "serverModuleFormat" | "future"
> & {
  future?: Omit<
    Config["future"],
    "v8_middleware" | "v8_splitRouteModules" | "v8_viteEnvironmentApi"
  >;
};

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
  reactRouterConfig = {},
  devExclude,
}: DevConfigOptions): DevConfig => {
  const presetDefine =
    platform == "netlify" ? netlifyPreset : platform == "vercel" ? vercelPreset : nodePreset;

  const preset = presetDefine({ nodeVersion, includeFiles });

  const { future, presets, ...restConfig } = reactRouterConfig;

  return {
    vitePluginOptions: {
      platform,
      nodeVersion,
      entryFile,
      devExclude,
    },
    reactRouterConfig: {
      ...restConfig,
      appDirectory,
      ssr: true,
      serverModuleFormat: "esm",
      presets: presets ? [...presets, preset] : [preset],
      future: {
        v8_middleware: true,
        v8_splitRouteModules: true,
        v8_viteEnvironmentApi: true,
        ...reactRouterConfig.future,
      },
    },
  };
};
