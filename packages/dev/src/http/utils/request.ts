import type { Socket } from "node:net";

export interface GetClientIpOptions {
  proxy: boolean;
  proxyCount?: number;
  ipHeaders?: string;
}

export function getRemoteAddr(req: Request, socket: Socket, options?: GetClientIpOptions): string {
  const { proxy = false, proxyCount = 0, ipHeaders = "x-forwarded-for" } = options || {};

  const val = req.headers.get(ipHeaders);

  let ips = proxy && val ? val.split(/\s*,\s*/) : [];

  if (proxyCount > 0) {
    ips = ips.slice(-proxyCount);
  }

  return ips[0] || socket.remoteAddress || "";
}

export function getRequestOrigin(req: Request, socket: Socket, proxy = false): string {
  const protocol = (socket as Socket & { encrypted?: boolean }).encrypted
    ? "https"
    : ((proxy ? req.headers.get("x-forwarded-proto") : null)?.split(/\s*,\s*/)[0] ?? "http");
  const host =
    (proxy ? req.headers.get("x-forwarded-host") : null)?.split(/\s*,\s*/)[0] ??
    req.headers.get("host");

  return `${protocol}://${host}`;
}
