interface ImportMetaEnv {
  readonly RESOLID_PLATFORM: "node" | "vercel" | "netlify";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
