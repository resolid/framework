import type { BuildManifest, Config as ReactRouterConfig } from "@react-router/dev/config";
import { makeRe } from "minimatch";
import nodePath from "node:path";
import { type UserConfig, normalizePath } from "vite";
import type { VitePluginOptions } from "../config";

interface ReactRouterPluginContext {
  rootDirectory: string;
  reactRouterConfig: Required<ReactRouterConfig>;
  environmentBuildContext: { name: "client" | "ssr" } | null;
  buildManifest: BuildManifest | null;
}

export interface ReactRouterPluginConfig {
  entryFile: string;
  appDir: string;
  buildDir: string;
  assetsDir: string;
  basename: string;
  future: ReactRouterConfig["future"];
  ssrBuild: boolean;
  buildManifest: BuildManifest | null;
}

export function resolveReactRouterPluginConfig(
  config: UserConfig,
  options: VitePluginOptions,
): ReactRouterPluginConfig | undefined {
  if (!("__reactRouterPluginContext" in config)) {
    return undefined;
  }

  const { reactRouterConfig, rootDirectory, buildManifest } =
    config.__reactRouterPluginContext as ReactRouterPluginContext;

  const appDir = nodePath.relative(rootDirectory, reactRouterConfig.appDirectory);

  return {
    entryFile: nodePath.join(appDir, options.entryFile),
    appDir,
    buildDir: nodePath.relative(rootDirectory, reactRouterConfig.buildDirectory),
    assetsDir: config.build?.assetsDir ?? "assets",
    ssrBuild: reactRouterConfig.ssr,
    basename: reactRouterConfig.basename,
    future: reactRouterConfig.future,
    buildManifest,
  };
}

export function createExcludePatterns(appDir: string, userExclude?: (string | RegExp)[]): RegExp[] {
  const appPath = normalizePath(appDir);
  const [appRoot] = appPath.split("/");

  const patterns: RegExp[] = [
    new RegExp(`^(?=\\/${appPath}\\/)((?!.*\\.data(\\?|$)).*\\..*(\\?.*)?$)`),
    new RegExp(`^(?=\\/${appPath}\\/.*\\/\\..*\\/.*)`),
  ];

  if (appPath != appRoot) {
    patterns.push(
      new RegExp(`^(?=\\/${appRoot}\\/)((?!.*\\.data(\\?|$)).*\\..*(\\?.*)?$)`),
      new RegExp(`^(?=\\/${appRoot}\\/.*\\/\\..*\\/.*)`),
    );
  }

  if (userExclude) {
    for (const pattern of userExclude) {
      if (pattern instanceof RegExp) {
        patterns.push(pattern);
      } else {
        try {
          patterns.push(makeRe(pattern) as RegExp);
        } catch {
          // do nothing
        }
      }
    }
  }

  return patterns;
}

export function shouldExcludeUrl(url: string, patterns: RegExp[]): boolean {
  if (url.includes("/node_modules/") || url.startsWith("/@") || url.includes("?import")) {
    return true;
  }

  for (const pattern of patterns) {
    if (pattern.test(url)) {
      return true;
    }
  }

  return false;
}
