import type { Plugin } from "vite";
import { reactRouter } from "@react-router/dev/vite";
import type { VitePluginOptions } from "../config";
import { resolidViteDev } from "./plugin";

export function resolidVite(options: VitePluginOptions): Plugin[] {
  return [resolidViteDev(options), ...reactRouter()];
}
