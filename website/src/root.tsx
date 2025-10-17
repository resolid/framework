import type { PropsWithChildren } from "react";
import { Outlet, Scripts, ScrollRestoration } from "react-router";

import style from "./root.css?url";

// noinspection JSUnusedGlobalSymbols
export const Layout = ({ children }: PropsWithChildren) => {
  // noinspection HtmlRequiredTitleElement
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0969da" />
        <title>Resolid</title>
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/favicon.svg" sizes="any" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link href={style} rel="stylesheet" />
      </head>
      <body className={"min-h-screen overflow-y-scroll"}>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
};

// noinspection JSUnusedGlobalSymbols
export default function Root() {
  return <Outlet />;
}
