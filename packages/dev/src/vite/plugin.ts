import type http from "node:http";
import type { Connect, RunnableDevEnvironment, ViteDevServer, Plugin as VitePlugin } from "vite";
import { getRequestListener } from "@hono/node-server";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import type { VitePluginOptions } from "../config";
import {
  createExcludePatterns,
  type ReactRouterPluginConfig,
  resolveReactRouterPluginConfig,
  shouldExcludeUrl,
} from "./utils";

export function resolidViteDev(options: VitePluginOptions): VitePlugin {
  let publicDirPath = "";
  let reactRouterConfig: ReactRouterPluginConfig | undefined;

  return {
    name: "@resolid/vite-dev-plugin",
    enforce: "post",
    config(config) {
      reactRouterConfig = resolveReactRouterPluginConfig(config, options);

      if (!reactRouterConfig) {
        return;
      }

      const baseConfig = {
        define: {
          "import.meta.env.RESOLID_PLATFORM": JSON.stringify(options.platform),
          "import.meta.env.RESOLID_BUILD_DIR": JSON.stringify(reactRouterConfig.buildDir),
          "import.meta.env.RESOLID_ASSETS_DIR": JSON.stringify(reactRouterConfig.assetsDir),
        },
        ssr: {
          noExternal: ["@resolid/dev"],
        },
      };

      if (!reactRouterConfig.future?.v8_viteEnvironmentApi && !reactRouterConfig.ssrBuild) {
        return baseConfig;
      }

      const ssrConfig = {
        build: {
          target: `node${options.nodeVersion}`,
          rollupOptions: {
            input: reactRouterConfig.entryFile,
          },
        },
      };

      if (reactRouterConfig.future?.v8_viteEnvironmentApi) {
        return {
          ...baseConfig,
          environments: {
            ssr: ssrConfig,
          },
        };
      }

      return {
        ...baseConfig,
        ...ssrConfig,
      };
    },

    configResolved(config) {
      publicDirPath = config.publicDir;

      if (reactRouterConfig?.buildManifest?.serverBundles) {
        for (const key of Object.keys(reactRouterConfig.buildManifest.serverBundles)) {
          if (config.environments[`ssrBundle_${key}`]) {
            config.environments[`ssrBundle_${key}`].build.rollupOptions.input =
              reactRouterConfig.entryFile;
          }
        }
      }
    },

    async configureServer(server) {
      if (!reactRouterConfig) {
        return;
      }

      const excludePatterns = createExcludePatterns(reactRouterConfig.appDir, options?.devExclude);

      const createMiddleware =
        async (devServer: ViteDevServer): Promise<Connect.HandleFunction> =>
        async (
          req: http.IncomingMessage,
          res: http.ServerResponse,
          next: Connect.NextFunction,
        ): Promise<void> => {
          if (req.url) {
            const filePath = join(publicDirPath, req.url);

            try {
              if (existsSync(filePath) && statSync(filePath).isFile()) {
                return next();
              }
            } catch {
              // do nothing
            }
          }

          if (req.url && shouldExcludeUrl(req.url, excludePatterns)) {
            return next();
          }

          const entry = reactRouterConfig!.entryFile;

          const app = reactRouterConfig!.future?.v8_viteEnvironmentApi
            ? (await (devServer.environments.ssr as RunnableDevEnvironment).runner.import(entry))[
                "default"
              ]
            : (await devServer.ssrLoadModule(entry))["default"];

          if (!app) {
            return next(new Error(`Failed to find default export from ${entry}`));
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
                  devServer.ssrFixStacktrace(err);
                } else if (typeof e === "string") {
                  err = new Error(`The response is not an instance of "Response", but: ${e}`);
                } else {
                  err = new Error(`Unknown error: ${e}`);
                }

                next(err);
              },
            },
          )(req, res);
        };

      server.middlewares.use(await createMiddleware(server));
    },

    handleHotUpdate({ server, modules }) {
      const isSSR = modules.some((mod) => mod._ssrModule);

      if (isSSR) {
        server.hot.send({ type: "full-reload" });
        return [];
      }
    },
  };
}
