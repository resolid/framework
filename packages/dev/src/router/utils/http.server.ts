import type { Socket } from "node:net";

interface GetClientIpOptions {
  proxy: boolean;
  proxyCount?: number;
  ipHeaders?: string;
}

export function getClientIp(req: Request, socket: Socket, options?: GetClientIpOptions): string {
  const { proxy = false, proxyCount = 0, ipHeaders = "x-forwarded-for" } = options || {};

  const val = req.headers.get(ipHeaders);

  let ips = proxy && val ? val.split(/\s*,\s*/) : [];

  if (proxyCount > 0) {
    ips = ips.slice(-proxyCount);
  }

  return ips[0] || socket.remoteAddress || "";
}

export function getRequestProtocol(req: Request, socket: Socket, proxy = false): string {
  if ((socket as Socket & { encrypted?: boolean }).encrypted) {
    return "https";
  }

  if (!proxy) {
    return "http";
  }

  const proto = req.headers.get("x-forwarded-proto");

  return proto ? proto.split(/\s*,\s*/, 1)[0] : "http";
}

export function getRequestHost(req: Request, proxy = false): string | null {
  const host = proxy && req.headers.get("x-forwarded-host");

  return host ? host.split(/\s*,\s*/, 1)[0] : req.headers.get("host");
}

export function getRequestOrigin(req: Request, socket: Socket, proxy = false): string {
  const protocol = getRequestProtocol(req, socket, proxy);
  const host = getRequestHost(req, proxy);

  return `${protocol}://${host}`;
}
