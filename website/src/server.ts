import { getClientIp, getRequestOrigin } from "@resolid/dev/router.server";
import { createServer, netlifyConfig, nodeConfig, vercelConfig } from "@resolid/dev/server";
import { ipAddress } from "@vercel/functions";
import { env } from "node:process";
import { RouterContextProvider } from "react-router";
import { app } from "~/app";

await app.run();

declare module "react-router" {
  interface RouterContextProvider {
    remoteAddress?: string;
    requestOrigin?: string;
  }
}

function createLoadContext(assign: Record<string, string | undefined>) {
  const context = new RouterContextProvider();

  Object.assign(context, assign);

  return context;
}

export default await createServer((platform) => {
  const onShutdown = async () => {
    await app.dispose();
  };

  switch (platform) {
    case "vercel":
      return vercelConfig({
        onShutdown,
        getLoadContext: (ctx) =>
          createLoadContext({
            remoteAddress: ipAddress(ctx.req.raw),
            requestOrigin: getRequestOrigin(
              ctx.req.raw,
              ctx.env.incoming.socket,
              env.RX_PROXY == 1,
            ),
          }),
      });

    case "netlify":
      return netlifyConfig({
        onShutdown,
        getLoadContext: (ctx) =>
          createLoadContext({
            remoteAddress: ctx.env.context.ip,
            requestOrigin: ctx.env.context.site.url,
          }),
      });

    default:
      return nodeConfig({
        port: env.SERVER_PORT,
        onShutdown,
        getLoadContext: (ctx) => {
          const proxy = env.RX_PROXY == 1;

          return createLoadContext({
            remoteAddress: getClientIp(ctx.req.raw, ctx.env.incoming.socket, {
              proxy: proxy,
              proxyCount: env.RX_PROXY_COUNT,
            }),
            requestOrigin: getRequestOrigin(ctx.req.raw, ctx.env.incoming.socket, proxy),
          });
        },
      });
  }
});
