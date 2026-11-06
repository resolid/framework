/// <reference types="vite/client" />

import type { RequestIdVariables } from "hono/request-id";

declare global {
  interface ImportMetaEnv {
    readonly RESOLID_LOADER?: "vite";
    readonly RESOLID_PLATFORM: "node" | "vercel" | "netlify";
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

// oxlint-disable-next-line typescript/no-empty-object-type
export interface AppContextVariables {}

type BuiltinContextVariables = {
  remoteAddr: string;
  publicOrigin: string;
} & RequestIdVariables;

declare module "hono" {
  // oxlint-disable-next-line typescript/no-empty-object-type
  interface ContextVariableMap extends BuiltinContextVariables, AppContextVariables {}
}
