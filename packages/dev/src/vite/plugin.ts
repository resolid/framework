import type { RunnableDevEnvironment, Plugin as VitePlugin, UserConfig } from "vite";
import { getRequestListener } from "@hono/node-server";
import { statSync } from "node:fs";
import nodePath from "node:path";
import { pathToFileURL } from "node:url";
import { id } from "rolldown/filter";
import type { VitePluginOptions } from "../config";
import { getServerBundleInfos } from "../base/utils";
import {
  createExcludePatterns,
  type ReactRouterPluginConfig,
  resolveReactRouterPluginConfig,
  shouldExcludeUrl,
} from "./utils";

export function resolidViteDev(options: VitePluginOptions): VitePlugin {
  let publicDir = "";
  let reactRouterConfig: ReactRouterPluginConfig | undefined;

  return {
    name: "@resolid/vite-dev-plugin",
    enforce: "post",
    config(config) {
      reactRouterConfig = resolveReactRouterPluginConfig(config, options);

      if (!reactRouterConfig) {
        return;
      }

      const baseConfig: UserConfig = {
        define: {
          "import.meta.env.RESOLID_PLATFORM": JSON.stringify(options.platform),
          "import.meta.env.RESOLID_BASENAME": JSON.stringify(reactRouterConfig.basename),
          "import.meta.env.RESOLID_BUILD_DIR": JSON.stringify(reactRouterConfig.buildDir),
          "import.meta.env.RESOLID_ASSETS_DIR": JSON.stringify(reactRouterConfig.assetsDir),
        },
        ssr: {
          noExternal: ["@resolid/dev"],
        },
        optimizeDeps: {
          exclude: ["@resolid/dev/http"],
        },
      };

      if (!reactRouterConfig.ssrBuild) {
        return baseConfig;
      }

      const ssrConfig: UserConfig = {
        build: {
          target: `node${options.nodeVersion}`,
          rolldownOptions: {
            input: reactRouterConfig.entryFile,
            output: {
              codeSplitting: false,
            },
          },
        },
      };

      return {
        ...baseConfig,
        environments: {
          ssr: ssrConfig,
        },
      };
    },

    configResolved(config) {
      ({ publicDir } = config);

      if (reactRouterConfig?.buildManifest?.serverBundles) {
        for (const key of Object.keys(reactRouterConfig.buildManifest.serverBundles)) {
          if (config.environments[`ssrBundle_${key}`]) {
            config.environments[`ssrBundle_${key}`]!.build.rolldownOptions.input =
              reactRouterConfig.entryFile;
          }
        }
      }
    },

    configureServer(server) {
      if (!reactRouterConfig) {
        return;
      }

      const { appDir, entryFile } = reactRouterConfig;

      const excludePatterns = createExcludePatterns(appDir, options.devExclude);

      server.middlewares.use(async (req, res, next) => {
        if (req.url) {
          if (shouldExcludeUrl(req.url, excludePatterns)) {
            return next();
          }

          // oxlint-disable-next-line node/no-sync
          if (statSync(nodePath.join(publicDir, req.url), { throwIfNoEntry: false })?.isFile()) {
            return next();
          }
        }

        const { default: app } = await (
          server.environments.ssr as RunnableDevEnvironment
        ).runner.import(entryFile);

        if (!app) {
          return next(new Error(`Failed to find default export from ${entryFile}`));
        }

        await getRequestListener(
          async (request) => {
            const response = await app.fetch(request, { incoming: req, outgoing: res });

            if (!(response instanceof Response)) {
              throw response;
            }

            return response;
          },
          {
            overrideGlobalObjects: false,
            errorHandler: (e) => {
              let err: Error;
              if (e instanceof Error) {
                err = e;
                server.ssrFixStacktrace(err);
              } else if (typeof e === "string") {
                err = new Error(`The response is not an instance of "Response", but: ${e}`);
              } else {
                err = new Error(`Unknown error: ${String(e)}`);
              }

              next(err);
            },
          },
        )(req, res);
      });
    },

    configurePreviewServer(server) {
      if (!reactRouterConfig) {
        return;
      }

      const { basename, buildManifest, buildDir, serverBuildFile } = reactRouterConfig;

      const buildInfo = buildManifest?.serverBundles
        ? getServerBundleInfos(buildManifest, basename).map((info) => ({
            id: info.id,
            prefix: info.prefix,
            file: buildManifest.serverBundles[info.id]?.file,
          }))
        : [
            {
              id: "site",
              prefix: basename,
              file: nodePath.join(buildDir, "server", serverBuildFile),
            },
          ];

      function getBundleFile(pathname: string): string | undefined {
        return buildInfo.find((info) => {
          return (
            info.prefix === "/" ||
            pathname === info.prefix ||
            pathname.startsWith(`${info.prefix}/`)
          );
        })?.file;
      }

      server.middlewares.use(async (req, res, next) => {
        const { pathname } = new URL(req.url ?? "/", "http://localhost");

        const bundleFile = getBundleFile(pathname.replace(/\.data$/, "").replace(/\/_$/, "/"));

        if (bundleFile) {
          try {
            const mod = await import(pathToFileURL(nodePath.resolve(bundleFile)).href);
            const app = mod.default;

            const headers = new Headers();
            for (const [name, value] of Object.entries(req.headers)) {
              for (const item of Array.isArray(value) ? value : [value]) {
                if (item !== undefined) {
                  headers.append(name, item);
                }
              }
            }

            const request = new Request(
              `http://${req.headers.host ?? "localhost"}${req.url ?? "/"}`,
              {
                method: req.method,
                headers,
              },
            );

            const response = await app.fetch(request, { incoming: req, outgoing: res });

            res.end(Buffer.from(await response.arrayBuffer()));
          } catch (error) {
            console.log(error);
            next(error);
          }
        } else {
          next();
        }
      });
    },

    handleHotUpdate({ server, modules }) {
      const isSSR = modules.some((mod) => mod.ssrModule);

      if (isSSR) {
        server.hot.send({ type: "full-reload" });
        return [];
      }
    },
  };
}
