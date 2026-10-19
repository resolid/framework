import type { BuildManifest } from "@react-router/dev/config";
import { existsSync } from "node:fs";
import {
  cp,
  mkdir,
  readdir,
  readFile,
  realpath,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import nodePath from "node:path";
import { build } from "rolldown";
import { esmExternalRequirePlugin } from "rolldown/plugins";
import { glob } from "tinyglobby";
import { type ResolvedConfig, searchForWorkspaceRoot } from "vite";
import type { NodeVersion, ServerPlatform } from "../types";

type OptionalToUndefined<T> = {
  [K in keyof T]: T[K] | undefined;
};

interface PackageJson {
  name?: string;
  type?: string;
  version?: string;
  scripts?: { postinstall?: string };
  dependencies?: Record<string, string>;
}

export interface PresetBaseOptions {
  nodeVersion: NodeVersion;
  includeFiles?: string[];
}

type BuildPresetOptions<BuildContext> = OptionalToUndefined<PresetBaseOptions> & {
  nodeVersion: NodeVersion;
  serverPlatform: ServerPlatform;
  buildManifest: BuildManifest | undefined;
  reactRouterConfig: Readonly<{
    appDirectory: string;
    buildDirectory: string;
    serverBuildFile: string;
  }>;
  viteConfig: ResolvedConfig;
  buildStart: () => Promise<BuildContext> | BuildContext;
  buildBundleEnd?: (
    context: BuildContext,
    buildPath: string,
    bundleId: string,
    bundleFile: string,
    packageDeps: Record<string, string>,
  ) => Promise<void>;
};

export async function buildPreset<BuildContext>({
  includeFiles = [],
  nodeVersion,
  serverPlatform,
  buildManifest,
  reactRouterConfig,
  viteConfig,
  buildStart,
  buildBundleEnd,
}: BuildPresetOptions<BuildContext>): Promise<void> {
  const rootPath = viteConfig.root;
  const { assetsDir } = viteConfig.build;
  const packageJson = JSON.parse(
    await readFile(nodePath.join(rootPath, "package.json"), "utf-8"),
  ) as PackageJson;
  const packageDeps = getPackageDependencies(
    packageJson.dependencies ?? {},
    viteConfig.ssr.external,
  );
  const serverBuildPath = nodePath.join(reactRouterConfig.buildDirectory, "server");

  const serverBundles = buildManifest?.serverBundles ?? {
    site: {
      id: "site",
      file: nodePath.relative(
        rootPath,
        nodePath.join(serverBuildPath, reactRouterConfig.serverBuildFile),
      ),
    },
  };

  const matchedFiles = includeFiles.length > 0 ? await glob(includeFiles, { cwd: rootPath }) : [];

  const context = await buildStart();

  await Promise.all(
    Object.entries(serverBundles).map(async ([, bundle]) => {
      const bundleId = bundle.id;
      const buildFile = nodePath.join(rootPath, bundle.file);
      const buildPath = nodePath.dirname(buildFile);

      await writePackageJson(
        nodePath.join(buildPath, "package.json"),
        packageJson,
        packageDeps,
        nodeVersion,
      );

      console.log(`Bundle file for ${bundleId}...`);

      const bundleFile = nodePath.join(buildPath, "server.mjs");

      await build({
        experimental: { lazyBarrel: false },
        input: buildFile,
        output: {
          file: bundleFile,
          codeSplitting: false,
          minify: "dce-only",
          comments: false,
        },
        platform: "node",
        transform: {
          define: {
            "process.env.NODE_ENV": JSON.stringify("production"),
            "import.meta.env.NODE_ENV": JSON.stringify("production"),
            "import.meta.env.RESOLID_PLATFORM": JSON.stringify(serverPlatform),
          },
          target: `node${nodeVersion}`,
        },
        external: ["vite", ...Object.keys(packageDeps)],
        plugins: [
          esmExternalRequirePlugin({
            external: ["vite", ...Object.keys(packageDeps)],
            skipDuplicateCheck: true,
          }),
        ],
        onLog(level, log, defaultHandler) {
          if (
            log.code === "MODULE_LEVEL_DIRECTIVE" &&
            (log.message.includes("use client") || log.message.includes("use server"))
          ) {
            return;
          }

          if (
            log.code === "SOURCEMAP_ERROR" &&
            log.message.includes("resolve original location") &&
            log.pos === 0
          ) {
            return;
          }

          defaultHandler(level, log);
        },
      });

      await rm(nodePath.join(buildPath, assetsDir), { force: true, recursive: true });
      await rm(buildFile, { force: true });

      await Promise.all(
        matchedFiles.map((file) =>
          cp(file, nodePath.join(serverBuildPath, file), { recursive: true }),
        ),
      );

      await buildBundleEnd?.(context, buildPath, bundleId, bundleFile, packageDeps);
    }),
  );
}

const reactRouterServerPackages = new Set([
  "react-router",
  "@react-router/architect",
  "@react-router/cloudflare",
  "@react-router/dev",
  "@react-router/express",
  "@react-router/node",
  "@react-router/serve",
]);

function getPackageDependencies(
  dependencies: Record<string, string | undefined>,
  ssrExternal: ResolvedConfig["ssr"]["external"],
): Record<string, string> {
  const ssrExternalFiltered = Array.isArray(ssrExternal)
    ? ssrExternal.filter((id) => !reactRouterServerPackages.has(id))
    : ssrExternal;

  if (ssrExternalFiltered === undefined) {
    return {};
  }

  const externalSet = ssrExternalFiltered === true ? true : new Set(ssrExternalFiltered);

  const result: Record<string, string> = {};

  for (const key of Object.keys(dependencies)) {
    if (externalSet === true || externalSet.has(key)) {
      result[key] = dependencies[key] ?? "";
    }
  }

  return result;
}

async function writePackageJson(
  outputFile: string,
  packageJson: PackageJson,
  packageDeps: Record<string, string>,
  nodeVersion: NodeVersion,
): Promise<void> {
  const distPkg = {
    name: packageJson.name,
    type: packageJson.type,
    version: packageJson.version,
    scripts: {
      postinstall: packageJson.scripts?.postinstall ?? "",
    },
    dependencies: packageDeps,
    engines: {
      node: `${nodeVersion}.x`,
    },
  };

  await writeFile(outputFile, JSON.stringify(distPkg, null, 2), "utf-8");
}

export async function createDir(paths: string[], rmBefore = false): Promise<string> {
  const presetRoot = nodePath.join(...paths);

  if (rmBefore) {
    await rm(presetRoot, { recursive: true, force: true });
  }

  await mkdir(presetRoot, { recursive: true });

  return presetRoot;
}

export function getServerRoutes(buildManifest: BuildManifest | undefined): {
  path: string;
  bundleId: string;
}[] {
  if (!buildManifest?.routeIdToServerBundleId) {
    return [{ path: "", bundleId: "site" }];
  }

  const { routes, routeIdToServerBundleId } = buildManifest;

  const routePaths: Map<string, string> = new Map();

  for (const route of Object.values(routes)) {
    if (route.id == "root") {
      continue;
    }

    const path = [...getRoutePathsFromParentId(routes, route.parentId), route.path].join("/");

    routePaths.set(route.id, `/${path}`);
  }

  const bundlePaths: Record<string, string[]> = {};

  for (const [routeId, bundleId] of Object.entries(routeIdToServerBundleId)) {
    const path = routePaths.get(routeId);

    if (path !== undefined) {
      (bundlePaths[bundleId] ??= []).push(path);
    }
  }

  const bundleRoutes: Record<string, { path: string; bundleId: string }> = {};

  for (const [bundleId, paths] of Object.entries(bundlePaths)) {
    // Shortest first, so a parent path always precedes its children.
    paths.sort((a, b) => a.length - b.length);

    const addedPaths: string[] = [];

    for (const path of paths) {
      if (bundleRoutes[path] || addedPaths.some((addedPath) => path.startsWith(addedPath))) {
        continue;
      }

      bundleRoutes[path] = { path, bundleId };
      addedPaths.push(path);
    }
  }

  return Object.values(bundleRoutes)
    .map((route) => ({
      path: route.path.endsWith("/") ? route.path.slice(0, -1) : route.path,
      bundleId: route.bundleId,
    }))
    .sort((a, b) => b.path.length - a.path.length);
}

function getRoutePathsFromParentId(routes: BuildManifest["routes"], parentId: string | undefined) {
  if (parentId == undefined) {
    return [];
  }

  const paths: string[] = [];

  const findPath = (routeId: string) => {
    const route = routes[routeId]!;

    if (route.parentId) {
      findPath(route.parentId);
    }

    if (route.path) {
      paths.push(route.path);
    }
  };

  findPath(parentId);

  return paths;
}

// from: https://github.com/sveltejs/kit/blob/main/packages/adapter-vercel/index.js
export async function copyFilesToFunction(
  bundleFile: string,
  destPath: string,
  nftCache: object,
): Promise<string> {
  const base = searchForWorkspaceRoot(bundleFile);

  const { nodeFileTrace } = await import("@vercel/nft");

  const traced = await nodeFileTrace([bundleFile], {
    base,
    cache: nftCache,
  });

  const fileList = [...traced.fileList].map((file) => nodePath.join(base, file));

  let ancestorDir = nodePath.dirname(fileList[0]!);

  for (const file of fileList.slice(1)) {
    while (!file.startsWith(ancestorDir)) {
      ancestorDir = nodePath.dirname(ancestorDir);
    }
  }

  await Promise.all(
    fileList.map(async (origin) => {
      const dest = nodePath.join(destPath, nodePath.relative(ancestorDir, origin));
      const real = await realpath(origin);

      const isSymlink = real !== origin;
      const statResult = await stat(origin);
      const isDirectory = statResult.isDirectory();

      await mkdir(nodePath.dirname(dest), { recursive: true });

      if (origin == bundleFile) {
        const bundleName = nodePath.basename(bundleFile);
        const sourceDir = nodePath.dirname(bundleFile);
        const destDir = nodePath.dirname(dest);
        const files = await readdir(sourceDir);
        const copies: Promise<void>[] = [];

        for (const file of files) {
          if (file !== bundleName) {
            copies.push(
              cp(nodePath.join(sourceDir, file), nodePath.join(destDir, file), { recursive: true }),
            );
          }
        }

        await Promise.all(copies);
      }

      if (isSymlink) {
        // oxlint-disable-next-line node/no-sync
        if (!existsSync(dest)) {
          await symlink(
            nodePath.relative(
              nodePath.dirname(dest),
              nodePath.join(destPath, nodePath.relative(ancestorDir, real)),
            ),
            dest,
            isDirectory ? "dir" : "file",
          );
        }
      } else if (!isDirectory) {
        await cp(origin, dest);
      }
    }),
  );

  return nodePath.relative(ancestorDir, bundleFile);
}
