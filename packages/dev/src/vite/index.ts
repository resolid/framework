import { reactRouter } from "@react-router/dev/vite";
import { reactRouterHonoServer } from "@resolid/react-router-hono/dev";
import type { Plugin, UserConfig } from "vite";
import type { VitePluginOptions } from "../config";

export const resolidVitePlugin = ({ platform, devExclude }: VitePluginOptions): Plugin[] => {
  return [
    {
      name: "@resolid/dev",
      enforce: "post",
      config() {
        return { define: { "import.meta.env.RESOLID_PLATFORM": JSON.stringify(platform) } } satisfies UserConfig;
      },
    },
    reactRouterHonoServer({
      entryFile: "server.ts",
      exclude: devExclude,
    }),
    ...reactRouter(),
  ];
};
