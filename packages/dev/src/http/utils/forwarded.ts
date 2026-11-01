export type TrustProxy = boolean | "loopback" | string[];

export function isTrustedProxy(trustProxy: TrustProxy, remoteAddress: string | undefined): boolean {
  if (trustProxy === true) {
    return true;
  }

  if (trustProxy === false || !remoteAddress) {
    return false;
  }

  const address = normalizeAddress(remoteAddress);

  if (trustProxy === "loopback") {
    return address === "::1" || address.startsWith("127.");
  }

  return trustProxy.includes(address);
}

function normalizeAddress(address: string): string {
  const normalized = address.toLowerCase();

  return normalized.startsWith("::ffff:") ? normalized.slice(7) : normalized;
}

export function parseForwarded(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const HOST_RE = /^(?:\[[A-Fa-f0-9:.]+\]|(?:[A-Za-z0-9_-]+\.)*[A-Za-z0-9_-]+)(?::\d{1,5})?$/;

export function getRequestInfo(
  trustProxy: TrustProxy,
  remoteAddress: string | undefined,
  requestUrl: string,
  requestHeaders: Headers,
): {
  remoteAddr: string;
  publicOrigin: string;
} {
  const url = new URL(requestUrl);

  if (!isTrustedProxy(trustProxy, remoteAddress)) {
    return {
      remoteAddr: remoteAddress ?? "",
      publicOrigin: url.origin,
    };
  }

  const forwardedFor = parseForwarded(requestHeaders.get("X-Forwarded-For"));

  let trusted = 0;
  while (
    trusted < forwardedFor.length &&
    isTrustedProxy(trustProxy, forwardedFor.at(-1 - trusted))
  ) {
    trusted++;
  }

  const clientIndex = Math.max(0, forwardedFor.length - 1 - trusted);
  const alignedAt = (list: string[]) => list[Math.min(clientIndex, list.length - 1)];

  const proto = alignedAt(parseForwarded(requestHeaders.get("X-Forwarded-Proto")));
  const host = alignedAt(parseForwarded(requestHeaders.get("X-Forwarded-Host")));

  const validProto = proto === "http" || proto === "https" ? proto : undefined;
  const validHost = host && HOST_RE.test(host) ? host : undefined;

  return {
    remoteAddr: forwardedFor[clientIndex] ?? remoteAddress ?? "",
    publicOrigin:
      validProto || validHost
        ? `${validProto ?? url.protocol.slice(0, -1)}://${validHost ?? url.host}`
        : url.origin,
  };
}
