import type { BuildManifest, Config as ReactRouterConfig } from "@react-router/dev/config";
import { Minimatch } from "minimatch";
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
  serverBuildFile: string;
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
    ssrBuild: reactRouterConfig.ssr !== false,
    basename: reactRouterConfig.basename,
    future: reactRouterConfig.future,
    buildManifest,
    serverBuildFile: reactRouterConfig.serverBuildFile,
  };
}

type ExcludeMatchers = { patterns: RegExp[]; matchers: Minimatch[] };

export function createExcludeMatchers(
  appDir: string,
  userExclude?: (string | RegExp)[],
): ExcludeMatchers {
  const appPath = normalizePath(appDir);
  const [appRoot] = appPath.split("/");

  const matchers: Minimatch[] = [];
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
    for (const exclude of userExclude) {
      if (exclude instanceof RegExp) {
        patterns.push(exclude);
      } else {
        matchers.push(new Minimatch(exclude));
      }
    }
  }

  return { patterns, matchers };
}

export function shouldExcludeUrl(url: string, matchers: ExcludeMatchers): boolean {
  if (
    url.includes("/node_modules/") ||
    url.startsWith("/.vite") ||
    url.startsWith("/__devtools") ||
    url.startsWith("/__devframes") ||
    url.startsWith("/static") ||
    url.startsWith("/@") ||
    url.includes("?import") ||
    url == "favicon.svg" ||
    url == "favicon.ico"
  ) {
    return true;
  }

  for (const pattern of matchers.patterns) {
    if (pattern.test(url)) {
      return true;
    }
  }

  for (const matcher of matchers.matchers) {
    // oxlint-disable-next-line unicorn/prefer-regexp-test
    if (matcher.match(url)) {
      return true;
    }
  }

  return false;
}
