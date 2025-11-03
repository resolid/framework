import { reactRouter } from "@react-router/dev/vite";
import type { Plugin } from "vite";
import type { VitePluginOptions } from "../config";
import { resolidDevVitePlugin } from "./plugin";

export function resolidVitePlugin(options: VitePluginOptions): Plugin[] {
  return [resolidDevVitePlugin(options), ...reactRouter()];
}
