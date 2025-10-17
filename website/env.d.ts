/// <reference types="vite/client" />
/// <reference types="@react-router/node" />

declare namespace NodeJS {
  export interface ProcessEnv {
    readonly SERVER_PORT: number | undefined;

    readonly NETLIFY: boolean;
    readonly VERCEL_URL: string;
  }
}

interface ImportMetaEnv {
  readonly VITE_NETLIFY?: boolean;
  readonly VITE_VERCEL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
