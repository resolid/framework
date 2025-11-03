interface ImportMetaEnv {
  readonly RESOLID_PLATFORM: string;
  readonly RESOLID_BUILD_DIR: string;
  readonly RESOLID_ASSETS_DIR: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
