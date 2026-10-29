import type { Preset } from "@react-router/dev/config";
import { writeFile } from "node:fs/promises";
import nodePath from "node:path";
import { name, version } from "../../../package.json";
import { type BundleInfo, getServerBundleInfos } from "../../base/utils";
import { buildPreset, copyFilesToFunction, createDir, type PresetBaseOptions } from "../utils";

type NetlifyPresetOptions = PresetBaseOptions;

export function netlifyPreset({ nodeVersion, includeFiles }: NetlifyPresetOptions): Preset {
  return {
    name: "@resolid/react-router-hono-netlify-preset",
    reactRouterConfig() {
      return {
        async buildEnd({ buildManifest, reactRouterConfig, viteConfig }) {
          await buildPreset<{
            netlifyRoot: string;
            netlifyFunctionDir: string;
            serverBundlesInfo: BundleInfo[];
            nftCache: object;
          }>({
            nodeVersion,
            serverPlatform: "netlify",
            includeFiles,
            buildManifest,
            reactRouterConfig,
            viteConfig,
            async buildStart() {
              const netlifyRoot = await createDir([viteConfig.root, ".netlify", "v1"], true);

              await writeNetlifyConfigJson(
                viteConfig.build.assetsDir,
                nodePath.join(netlifyRoot, "config.json"),
              );

              const netlifyFunctionDir = await createDir([netlifyRoot, "functions"]);

              const serverBundlesInfo = getServerBundleInfos(
                buildManifest,
                reactRouterConfig.basename,
              );

              return { netlifyRoot, netlifyFunctionDir, serverBundlesInfo, nftCache: {} };
            },
            async buildBundleEnd(context, _buildPath, bundleId, bundleFile) {
              console.log(`Coping Netlify function files for ${bundleId}...`);

              const handleFile = await copyFilesToFunction(
                bundleFile,
                await createDir([context.netlifyFunctionDir, bundleId], true),
                context.nftCache,
              );

              const prefix = context.serverBundlesInfo.find((r) => r.id == bundleId)?.prefix;
              const paths = prefix && prefix !== "/" ? [prefix, `${prefix}/*`] : "/*";

              await writeFile(
                nodePath.join(context.netlifyFunctionDir, `${bundleId}.mjs`),
                `export { default } from "./${nodePath.join(bundleId, handleFile)}";

export const config = {
  path: ${Array.isArray(paths) ? JSON.stringify(paths) : `"${paths}"`},
  displayName: "${bundleId} server",
  generator: "${name}@${version}",
  preferStatic: true,
  nodeVersion: ${nodeVersion}
};
`,
                "utf-8",
              );
            },
          });
        },
      };
    },
  };
}

async function writeNetlifyConfigJson(assetsDir: string, netlifyConfigFile: string) {
  console.log("Writing Netlify config file...");

  const configJson: { headers: unknown[] } = {
    headers: [],
  };

  configJson.headers.push({
    for: `^/${assetsDir}/.*`,
    values: { "Cache-Control": "public, max-age=31536000, immutable" },
  });

  await writeFile(netlifyConfigFile, JSON.stringify(configJson, null, 2), "utf-8");
}
