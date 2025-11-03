import type { BuildManifest, Config as ReactRouterConfig } from "@react-router/dev/config";
import { makeRe } from "minimatch";
import type http from "node:http";
import { join, relative } from "node:path";
import type { UserConfig } from "vite";
import { normalizePath } from "vite";
import type { VitePluginOptions } from "../config";

export type Fetch = (
  request: Request,
  env: { incoming: http.IncomingMessage; outgoing: http.ServerResponse },
) => Promise<Response>;

export type ReactRouterPluginContext = {
  rootDirectory: string;
  reactRouterConfig: Required<ReactRouterConfig>;
  environmentBuildContext: { name: "client" | "ssr" } | null;
  buildManifest: BuildManifest;
};

export type ReactRouterPluginConfig = {
  entryFile: string;
  appDir: string;
  buildDir: string;
  assetsDir: string;
  future: ReactRouterConfig["future"];
  ssrBuild: boolean;
  buildManifest: BuildManifest;
};

export function resolveReactRouterPluginConfig(
  config: UserConfig,
  options: VitePluginOptions,
): ReactRouterPluginConfig | undefined {
  if (!("__reactRouterPluginContext" in config)) {
    return undefined;
  }

  const { reactRouterConfig, rootDirectory, buildManifest, environmentBuildContext } =
    config.__reactRouterPluginContext as ReactRouterPluginContext;

  const appDir = relative(rootDirectory, reactRouterConfig.appDirectory);

  return {
    entryFile: join(appDir, options.entryFile),
    appDir: appDir,
    buildDir: relative(rootDirectory, reactRouterConfig.buildDirectory),
    assetsDir: config.build?.assetsDir || "assets",
    ssrBuild: environmentBuildContext?.name === "ssr",
    future: reactRouterConfig.future,
    buildManifest,
  };
}

export function createExcludePatterns(appDir: string, userExclude?: (string | RegExp)[]): RegExp[] {
  const appPath = normalizePath(appDir);
  const appRoot = appPath.split("/")[0];

  const patterns: RegExp[] = [
    new RegExp(`^(?=\\/${appPath}\\/)((?!.*\\.data(\\?|$)).*\\..*(\\?.*)?$)`),
    new RegExp(`^(?=\\/${appPath}\\/.*\\/\\..*\\/.*)`),
  ];

  if (appPath != appRoot) {
    patterns.push(new RegExp(`^(?=\\/${appRoot}\\/)((?!.*\\.data(\\?|$)).*\\..*(\\?.*)?$)`));
    patterns.push(new RegExp(`^(?=\\/${appRoot}\\/.*\\/\\..*\\/.*)`));
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
