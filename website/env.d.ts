/// <reference types="vite/client" />
/// <reference types="@react-router/node" />

declare namespace NodeJS {
  export interface ProcessEnv {
    readonly SERVER_PORT: number | undefined;

    readonly VERCEL: number;
    readonly NETLIFY: boolean;
  }
}

interface ImportMetaEnv {
  readonly VITE_VERCEL?: number;
  readonly VITE_NETLIFY?: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
