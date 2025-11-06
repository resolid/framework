/// <reference types="vite/client" />
/// <reference types="@react-router/node" />

declare namespace NodeJS {
  export interface ProcessEnv {
    readonly SERVER_PORT: number | undefined;

    readonly RX_DB_URI: string;
    readonly RX_DB_SSL_CA: string;
    readonly RX_DB_TABLE_PREFIX: string;

    readonly VERCEL: number;
    readonly NETLIFY: boolean;
  }
}

interface ImportMetaEnv {
  readonly RESOLID_PLATFORM: "node" | "vercel" | "netlify";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
