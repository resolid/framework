/// <reference types="vite/client" />
/// <reference types="@resolid/dev/env" />

declare namespace NodeJS {
  export interface ProcessEnv {
    readonly SERVER_PORT: number | undefined;

    readonly RX_CACHE_REDIS: string;

    readonly RX_DB_URI: string;
    readonly RX_DB_SSL_CA: string;
    readonly RX_DB_TABLE_PREFIX: string;

    readonly RX_MAIL_FROM: string;
    readonly RX_MAIL_HOST: string;
    readonly RX_MAIL_PORT: number;
    readonly RX_MAIL_USER: string;
    readonly RX_MAIL_PASSWORD: string;

    readonly RX_PROXY: number;
    readonly RX_PROXY_COUNT: number;

    readonly VERCEL: number;
    readonly NETLIFY: boolean;
  }
}
