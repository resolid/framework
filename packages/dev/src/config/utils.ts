import type { BuildManifest } from "@react-router/dev/config";
import fg from "fast-glob";
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

  const matchedFiles = includeFiles.length > 0 ? await fg(includeFiles, { cwd: rootPath }) : [];

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

function getPackageDependencies(
  dependencies: Record<string, string | undefined>,
  ssrExternal: ResolvedConfig["ssr"]["external"],
): Record<string, string> {
  const ssrExternalFiltered = Array.isArray(ssrExternal)
    ? ssrExternal.filter(
        (id) =>
          ![
            "react-router",
            "@react-router/architect",
            "@react-router/cloudflare",
            "@react-router/dev",
            "@react-router/express",
            "@react-router/node",
            "@react-router/serve",
          ].includes(id),
      )
    : ssrExternal;

  if (ssrExternalFiltered === undefined) {
    return {};
  }

  const result: Record<string, string> = {};

  for (const key of Object.keys(dependencies)) {
    if (ssrExternalFiltered === true || ssrExternalFiltered.includes(key)) {
      result[key] = dependencies[key] ?? "";
    }
  }

  return result;
}

async function writePackageJson(
  outputFile: string,
  packageJson: PackageJson,
  packageDeps: unknown,
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
  if (buildManifest?.routeIdToServerBundleId) {
    const routes: { id: string; path: string }[] = Object.values(buildManifest.routes)
      .filter((route) => route.id != "root")
      .map((route) => {
        const path = [
          ...getRoutePathsFromParentId(buildManifest.routes, route.parentId),
          route.path,
        ].join("/");

        return {
          id: route.id,
          path: `/${path}`,
        };
      });

    const routePathBundles: Record<string, string[]> = {};

    for (const [routeId, serverBoundId] of Object.entries(buildManifest.routeIdToServerBundleId)) {
      routePathBundles[serverBoundId] ??= [];

      for (const routePath of routes) {
        if (routePath.id == routeId) {
          routePathBundles[serverBoundId].push(routePath.path);
        }
      }
    }

    const bundleRoutes: Record<string, { path: string; bundleId: string }> = {};

    for (const [bundleId, paths] of Object.entries(routePathBundles)) {
      paths.sort((a, b) => (a.length < b.length ? -1 : 1));

      for (const path of paths) {
        if (
          !bundleRoutes[path] &&
          !Object.keys(bundleRoutes).some(
            (key) =>
              bundleRoutes[key]!.bundleId == bundleId && path.startsWith(bundleRoutes[key]!.path),
          )
        ) {
          bundleRoutes[path] = { path, bundleId };
        }
      }
    }

    const result = Object.values(bundleRoutes).map((route) => ({
      path: route.path.endsWith("/") ? route.path.slice(0, -1) : route.path,
      bundleId: route.bundleId,
    }));

    result.sort((a, b) => (a.path.length > b.path.length ? -1 : 1));

    return result;
  }

  return [{ path: "", bundleId: "site" }];
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
