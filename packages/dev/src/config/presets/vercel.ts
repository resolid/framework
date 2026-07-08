import type { BuildManifest, Preset } from "@react-router/dev/config";
import { cp, rm, writeFile } from "node:fs/promises";
import nodePath from "node:path";
import {
  buildPreset,
  copyFilesToFunction,
  createDir,
  getServerRoutes,
  type PresetBaseOptions,
} from "../utils";

type VercelPresetOptions = PresetBaseOptions;

export function vercelPreset({ nodeVersion, includeFiles }: VercelPresetOptions): Preset {
  return {
    name: "@resolid/react-router-hono-vercel-preset",
    reactRouterConfig() {
      return {
        buildEnd: async ({ buildManifest, reactRouterConfig, viteConfig }) => {
          await buildPreset<{ vercelOutput: string; nftCache: object }>({
            nodeVersion,
            serverPlatform: "vercel",
            includeFiles,
            buildManifest,
            reactRouterConfig,
            viteConfig,
            async buildStart() {
              const vercelOutput = await createDir([viteConfig.root, ".vercel", "output"], true);

              await copyStaticFiles(
                nodePath.join(reactRouterConfig.buildDirectory, "client"),
                vercelOutput,
              );
              await writeVercelConfigJson(
                viteConfig.build.assetsDir,
                buildManifest,
                nodePath.join(vercelOutput, "config.json"),
              );

              return { vercelOutput, nftCache: {} };
            },
            async buildBundleEnd(context, _buildPath, bundleId, bundleFile) {
              console.log(`Coping Vercel function files for ${bundleId}...`);

              const vercelFunctionDir = await createDir(
                [context.vercelOutput, "functions", `_${bundleId}.func`],
                true,
              );

              const handleFile = await copyFilesToFunction(
                bundleFile,
                vercelFunctionDir,
                context.nftCache,
              );

              await writeFile(
                nodePath.join(vercelFunctionDir, ".vc-config.json"),
                JSON.stringify(
                  {
                    handler: handleFile,
                    runtime: `nodejs${nodeVersion}.x`,
                    launcherType: "Nodejs",
                    supportsResponseStreaming: true,
                  },
                  null,
                  2,
                ),
                "utf-8",
              );
            },
          });
        },
      };
    },
  };
}

async function copyStaticFiles(outDir: string, vercelOutDir: string) {
  console.log("Copying assets...");

  const vercelStaticDir = await createDir([vercelOutDir, "static"]);

  await cp(outDir, vercelStaticDir, {
    recursive: true,
    force: true,
  });

  await rm(nodePath.join(vercelStaticDir, ".vite"), { recursive: true, force: true });
}

async function writeVercelConfigJson(
  assetsDir: string,
  buildManifest: BuildManifest | undefined,
  vercelConfigFile: string,
) {
  console.log("Writing Vercel config file...");

  const configJson: { version: number; routes: unknown[]; framework: { slug: string } } = {
    version: 3,
    routes: [],
    framework: {
      slug: "vite",
    },
  };

  configJson.routes.push(
    {
      src: `^/${assetsDir}/.*`,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
      continue: true,
    },
    {
      handle: "filesystem",
    },
  );

  const serverRoutes = getServerRoutes(buildManifest);

  for (const bundle of serverRoutes) {
    if (bundle.path.length > 0) {
      configJson.routes.push({
        src: `^${bundle.path}(?:/.*)?$`,
        dest: `_${bundle.bundleId}`,
      });
    } else {
      configJson.routes.push({
        src: "^/.*$",
        dest: `_${bundle.bundleId}`,
      });
    }
  }

  await writeFile(vercelConfigFile, JSON.stringify(configJson, null, 2), "utf-8");
}
