interface ImportMetaEnv {
  readonly RESOLID_PLATFORM: string;
  readonly RESOLID_BASENAME: string;
  readonly RESOLID_BUILD_DIR: string;
  readonly RESOLID_ASSETS_DIR: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace NodeJS {
  export interface ProcessEnv {
    readonly SERVER_PATH: string | undefined;
  }
}

declare module "virtual:react-router/server-build" {
  import type { ServerBuild } from "react-router";

  const build: ServerBuild;

  export = build;
}
