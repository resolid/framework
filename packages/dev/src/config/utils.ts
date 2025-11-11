import type { BuildManifest } from "@react-router/dev/config";
import fg from "fast-glob";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, realpath, rm, stat, symlink, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { build } from "rolldown";
import { esmExternalRequirePlugin } from "rolldown/plugins";
import { type ResolvedConfig, searchForWorkspaceRoot } from "vite";
import type { NodeVersions } from "../types";

type OptionalToUndefined<T> = {
  [K in keyof T]: T[K] | undefined;
};

type PackageJson = {
  name?: string;
  type?: string;
  version?: string;
  scripts?: { postinstall?: string };
  dependencies?: Record<string, string>;
};

export type PresetBaseOptions = {
  includeFiles?: string[];
};

type BuildPresetOptions<BuildContext> = OptionalToUndefined<PresetBaseOptions> & {
  nodeVersion: NodeVersions["node"];
  buildManifest: BuildManifest | undefined;
  reactRouterConfig: Readonly<{
    appDirectory: string;
    buildDirectory: string;
    serverBuildFile: string;
  }>;
  viteConfig: ResolvedConfig;
  buildStart: () => Promise<BuildContext>;
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
  nodeVersion = 22,
  buildManifest,
  reactRouterConfig,
  viteConfig,
  buildStart,
  buildBundleEnd,
}: BuildPresetOptions<BuildContext>): Promise<void> {
  const rootPath = viteConfig.root;
  const assetsDir = viteConfig.build.assetsDir ?? "assets";
  const packageJson = JSON.parse(await readFile(join(rootPath, "package.json"), "utf8")) as PackageJson;
  const packageDeps = getPackageDependencies(packageJson.dependencies ?? {}, viteConfig.ssr.external);
  const serverBuildPath = join(reactRouterConfig.buildDirectory, "server");

  const serverBundles = buildManifest?.serverBundles ?? {
    site: {
      id: "site",
      file: relative(rootPath, join(serverBuildPath, reactRouterConfig.serverBuildFile)),
    },
  };

  const matchedFiles = includeFiles?.length > 0 ? await fg(includeFiles, { cwd: rootPath }) : [];

  const context = await buildStart();

  for (const bundle in serverBundles) {
    const bundleId = serverBundles[bundle].id;
    const buildFile = join(rootPath, serverBundles[bundle].file);
    const buildPath = dirname(buildFile);

    await writePackageJson(join(buildPath, "package.json"), packageJson, packageDeps, nodeVersion);

    console.log(`Bundle file for ${bundleId}...`);

    const bundleFile = join(buildPath, "server.mjs");

    await build({
      input: buildFile,
      output: {
        file: bundleFile,
        inlineDynamicImports: true,
        legalComments: "none",
      },
      platform: "node",
      transform: {
        define: {
          "process.env.NODE_ENV": JSON.stringify("production"),
          "import.meta.env.NODE_ENV": JSON.stringify("production"),
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

    await rm(join(buildPath, assetsDir), { force: true, recursive: true });
    await rm(buildFile, { force: true });

    for (const file of matchedFiles) {
      await cp(file, join(serverBuildPath, file), { recursive: true });
    }

    await buildBundleEnd?.(context, buildPath, bundleId, bundleFile, packageDeps);
  }
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
            "react-router-dom",
            "@react-router/architect",
            "@react-router/cloudflare",
            "@react-router/dev",
            "@react-router/express",
            "@react-router/node",
            "@react-router/serve",
          ].includes(id),
      )
    : ssrExternal;

  return Object.keys(dependencies)
    .filter((key) => {
      if (ssrExternalFiltered === undefined) {
        return false;
      }

      if (ssrExternalFiltered === true) {
        return true;
      }

      return ssrExternalFiltered.includes(key);
    })
    .reduce((obj: Record<string, string>, key) => {
      obj[key] = dependencies[key] ?? "";

      return obj;
    }, {});
}

async function writePackageJson(
  outputFile: string,
  packageJson: PackageJson,
  packageDeps: unknown,
  nodeVersion: NodeVersions["node"],
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

  await writeFile(outputFile, JSON.stringify(distPkg, null, 2), "utf8");
}

export async function createDir(paths: string[], rmBefore: boolean = false): Promise<string> {
  const presetRoot = join(...paths);

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
        const path = [...getRoutePathsFromParentId(buildManifest.routes, route.parentId), route.path].join("/");

        return {
          id: route.id,
          path: `/${path}`,
        };
      });

    const routePathBundles: Record<string, string[]> = {};

    for (const routeId in buildManifest?.routeIdToServerBundleId) {
      const serverBoundId = buildManifest?.routeIdToServerBundleId[routeId];

      if (!routePathBundles[serverBoundId]) {
        routePathBundles[serverBoundId] = [];
      }

      for (const routePath of routes) {
        if (routePath.id == routeId) {
          routePathBundles[serverBoundId].push(routePath.path);
        }
      }
    }

    const bundleRoutes: Record<string, { path: string; bundleId: string }> = {};

    for (const bundleId in routePathBundles) {
      const paths = routePathBundles[bundleId];

      paths.sort((a, b) => (a.length < b.length ? -1 : 1));

      for (const path of paths) {
        if (
          !bundleRoutes[path] &&
          !Object.keys(bundleRoutes).find((key) => {
            return bundleRoutes[key].bundleId == bundleId && path.startsWith(bundleRoutes[key].path);
          })
        ) {
          bundleRoutes[path] = { path: path, bundleId: bundleId };
        }
      }
    }

    const result = Object.values(bundleRoutes).map((route) => {
      return { path: route.path.endsWith("/") ? route.path.slice(0, -1) : route.path, bundleId: route.bundleId };
    });

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
    const route = routes[routeId];

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
export async function copyFilesToFunction(bundleFile: string, destPath: string, nftCache: object): Promise<string> {
  const base = searchForWorkspaceRoot(bundleFile);

  const { nodeFileTrace } = await import("@vercel/nft");

  const traced = await nodeFileTrace([bundleFile], {
    base,
    cache: nftCache,
  });

  const fileList = Array.from(traced.fileList).map((file) => join(base, file));

  let ancestorDir = dirname(fileList[0]);

  for (const file of fileList.slice(1)) {
    while (!file.startsWith(ancestorDir)) {
      ancestorDir = dirname(ancestorDir);
    }
  }

  for (const origin of fileList) {
    const dest = join(destPath, relative(ancestorDir, origin));
    const real = await realpath(origin);

    const isSymlink = real !== origin;
    const isDirectory = (await stat(origin)).isDirectory();

    await mkdir(dirname(dest), { recursive: true });

    if (origin == bundleFile) {
      const sourceDir = dirname(bundleFile);
      const destDir = dirname(dest);

      for (const file of (await readdir(sourceDir)).filter((file) => file != basename(bundleFile))) {
        await cp(join(sourceDir, file), join(destDir, file), { recursive: true });
      }
    }

    if (isSymlink) {
      if (!existsSync(dest)) {
        await symlink(
          relative(dirname(dest), join(destPath, relative(ancestorDir, real))),
          dest,
          isDirectory ? "dir" : "file",
        );
      }
    } else if (!isDirectory) {
      await cp(origin, dest);
    }
  }

  return relative(ancestorDir, bundleFile);
}
