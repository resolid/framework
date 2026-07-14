import type { RequestIdVariables } from "hono/request-id";

interface ImportMetaEnv {
  readonly RESOLID_PLATFORM: "node" | "vercel" | "netlify";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// oxlint-disable-next-line typescript/no-empty-object-type
export interface AppVariableMap {}

type ClientVariables = {
  clientIp: string;
  requestOrigin: string | undefined;
} & RequestIdVariables;

declare module "hono" {
  // oxlint-disable-next-line typescript/no-empty-object-type
  interface ContextVariableMap extends ClientVariables, AppVariableMap {}
}
