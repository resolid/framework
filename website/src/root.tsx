import type { PropsWithChildren } from "react";
import { ConfigProvider } from "@resolid/react-ui";
import zhCN from "@resolid/react-ui/locales/zh-CN";
import { Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { ErrorComponent } from "~/components/error-component";
import { RouteProcessBar } from "~/components/route-process-bar";
import { VercelAnalytics } from "~/extensions/vercel/vercel-analytics";
import { VercelSpeedInsights } from "~/extensions/vercel/vercel-speed-insights";
import { requestIdMiddleware } from "./extensions/middlewares/request-id.server";

import style from "./root.css?url";

export const middleware = [requestIdMiddleware];

// noinspection HtmlRequiredTitleElement
export const Layout = ({ children }: PropsWithChildren) => (
  <html lang="zh-CN" suppressHydrationWarning>
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#0969da" />
      <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
      <link rel="icon" href="/favicon.ico" sizes="48x48" />
      <link rel="icon" href="/favicon.svg" sizes="any" type="image/svg+xml" />
      <Meta />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      <link rel="stylesheet" href={style} />
    </head>
    <body className="min-h-screen overflow-y-scroll">
      <RouteProcessBar />
      <ConfigProvider locale={zhCN} colorMode={{ disableTransition: true }}>
        {children}
      </ConfigProvider>
      <ScrollRestoration />
      <Scripts />
      {import.meta.env.RESOLID_PLATFORM == "vercel" && (
        <>
          <VercelAnalytics endpoint="/growth" scriptSrc="/growth/script.js" />
          <VercelSpeedInsights
            endpoint="/speed-growth/vitals"
            scriptSrc="/speed-growth/script.js"
          />
        </>
      )}
    </body>
  </html>
);

export const ErrorBoundary = ErrorComponent;

export default function Root() {
  return <Outlet />;
}
