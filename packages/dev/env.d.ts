import type { Context } from "hono";

interface ImportMetaEnv {
  readonly RESOLID_PLATFORM: "node" | "vercel" | "netlify";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

type HonoContext = {
  hono: Context;
};

declare module "react-router" {
  // oxlint-disable-next-line typescript/no-empty-object-type
  interface RouterContextProvider extends HonoContext {}
}
