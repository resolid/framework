import type { BuildManifest } from "@react-router/dev/config";
import type { ResolvedConfig } from "vite";
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
import type { NodeVersion, ServerPlatform } from "../base/types";

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
  buildManifest: BuildManifest | undefined | null;
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
  const [{ build }, { esmExternalRequirePlugin }, { glob }] = await Promise.all([
    import("rolldown"),
    import("rolldown/plugins"),
    import("tinyglobby"),
  ]);

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

// from: https://github.com/sveltejs/kit/blob/main/packages/adapter-vercel/index.js
export async function copyFilesToFunction(
  bundleFile: string,
  destPath: string,
  nftCache: object,
): Promise<string> {
  const [{ nodeFileTrace }, { searchForWorkspaceRoot }] = await Promise.all([
    import("@vercel/nft"),
    import("vite"),
  ]);

  const base = searchForWorkspaceRoot(bundleFile);

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
