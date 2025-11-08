import { ResolidProvider } from "@resolid/react-ui";
import type { PropsWithChildren } from "react";
import { Outlet, Scripts, ScrollRestoration } from "react-router";
import { RouteProcessBar } from "~/components/route-process-bar";

import style from "./root.css?url";

export const Layout = ({ children }: PropsWithChildren) => {
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
        <RouteProcessBar />
        <ResolidProvider>{children}</ResolidProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
};

export default function Root() {
  return <Outlet />;
}
