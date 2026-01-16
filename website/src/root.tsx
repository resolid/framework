import { ConfigProvider } from "@resolid/react-ui";
import type { PropsWithChildren } from "react";
import { Outlet, Scripts, ScrollRestoration } from "react-router";
import { RouteProcessBar } from "~/components/route-process-bar";
import { VercelAnalytics } from "~/extensions/vercel/vercel-analytics";
import { VercelSpeedInsights } from "~/extensions/vercel/vercel-speed-insights";

import style from "./root.css?url";

export const Layout = ({ children }: PropsWithChildren) => {
  const defaultLocale = "zh-CN";

  return (
    <html lang={defaultLocale} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0969da" />
        <title>Resolid</title>
        <meta
          name="description"
          content="A modern full-stack framework for building fast, scalable, and maintainable web applications."
        />
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/favicon.svg" sizes="any" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link href={style} rel="stylesheet" />
      </head>
      <body className={"min-h-screen overflow-y-scroll"}>
        <RouteProcessBar />
        <ConfigProvider locale={defaultLocale} colorMode={{ disableTransition: true }}>
          {children}
        </ConfigProvider>
        <ScrollRestoration />
        <Scripts />
        {import.meta.env.RESOLID_PLATFORM == "vercel" && (
          <>
            <VercelAnalytics endpoint={"/growth"} scriptSrc={"/growth/script.js"} />
            <VercelSpeedInsights
              endpoint={"/speed-growth/vitals"}
              scriptSrc={"/speed-growth/script.js"}
            />
          </>
        )}
      </body>
    </html>
  );
};

export default function Root() {
  return <Outlet />;
}
