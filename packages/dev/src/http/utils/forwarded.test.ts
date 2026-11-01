import { describe, expect, it } from "vitest";
import { getRequestInfo, isTrustedProxy, parseForwarded } from "./forwarded";

describe("isTrustedProxy", () => {
  it("allowlist matches an IPv4-mapped IPv6 peer by its bare IPv4 form", () => {
    expect(isTrustedProxy(["10.0.0.1"], "::ffff:10.0.0.1")).toBe(true);
    expect(isTrustedProxy(["10.0.0.2"], "::ffff:10.0.0.1")).toBe(false);
  });

  it("allowlist still matches a plain address exactly", () => {
    expect(isTrustedProxy(["10.0.0.1"], "10.0.0.1")).toBe(true);
    expect(isTrustedProxy(["10.0.0.1"], "9.9.9.9")).toBe(false);
  });

  it("false/undefined never trust; true always trusts", () => {
    expect(isTrustedProxy(false, "10.0.0.1")).toBe(false);
    expect(isTrustedProxy(true, undefined)).toBe(true);
  });

  it('"loopback" matches IPv4/IPv6 loopback including IPv4-mapped', () => {
    expect(isTrustedProxy("loopback", "127.0.0.1")).toBe(true);
    expect(isTrustedProxy("loopback", "::1")).toBe(true);
    expect(isTrustedProxy("loopback", "::ffff:127.0.0.1")).toBe(true);
    expect(isTrustedProxy("loopback", "203.0.113.5")).toBe(false);
  });
});

describe("parseForwarded", () => {
  it("returns an empty array for null or empty values", () => {
    expect(parseForwarded(null)).toEqual([]);
    expect(parseForwarded("")).toEqual([]);
  });

  it("splits on commas, trims whitespace and drops empty entries", () => {
    expect(parseForwarded("1.1.1.1, 2.2.2.2 ,, 3.3.3.3")).toEqual([
      "1.1.1.1",
      "2.2.2.2",
      "3.3.3.3",
    ]);
  });
});

const fallbackOrigin = "http://origin.example";

const run = (
  trustProxy: Parameters<typeof getRequestInfo>[0],
  remoteAddress: string | undefined,
  originUrl: string,
  headers: Record<string, string> = {},
) => getRequestInfo(trustProxy, remoteAddress, originUrl, new Headers(headers));

describe("getRequestInfo", () => {
  it("rewrites url and ip when the peer is trusted", () => {
    const info = run(true, "10.0.0.1", fallbackOrigin, {
      "x-forwarded-proto": "https",
      "x-forwarded-host": "public.example",
      "x-forwarded-for": "1.2.3.4",
    });

    expect(info.remoteAddr).toBe("1.2.3.4");
    expect(info.publicOrigin).toBe("https://public.example");
  });

  it("leaves the request untouched when the peer is not trusted", () => {
    const info = run(["10.0.0.1"], "9.9.9.9", fallbackOrigin, {
      "x-forwarded-proto": "https",
      "x-forwarded-host": "public.example",
      "x-forwarded-for": "1.2.3.4",
    });

    expect(info.remoteAddr).toBe("9.9.9.9");
    expect(info.publicOrigin).toBe(fallbackOrigin);
  });

  it('"loopback" trusts a loopback peer', () => {
    const info = run("loopback", "127.0.0.1", fallbackOrigin, {
      "x-forwarded-host": "public.example",
    });

    expect(new URL(info.publicOrigin).host).toBe("public.example");
  });

  it('"loopback" ignores a non-loopback peer', () => {
    const info = run("loopback", "203.0.113.5", fallbackOrigin, {
      "x-forwarded-host": "public.example",
    });

    expect(new URL(info.publicOrigin).host).toBe("origin.example");
  });

  it("allowlist trusts a listed peer", () => {
    const info = run(["10.0.0.1", "10.0.0.2"], "10.0.0.2", fallbackOrigin, {
      "x-forwarded-for": "1.2.3.4",
    });

    expect(info.remoteAddr).toBe("1.2.3.4");
  });

  it("all hops trusted (trustProxy: true) -> leftmost X-Forwarded-For is the client", () => {
    const info = run(true, "10.0.0.1", fallbackOrigin, {
      "x-forwarded-host": "outer.example, inner.example",
      "x-forwarded-for": "1.2.3.4, 10.0.0.9, 10.0.0.1",
    });

    expect(new URL(info.publicOrigin).host).toBe("outer.example");
    expect(info.remoteAddr).toBe("1.2.3.4");
  });

  it("hop-aware: client is the rightmost address NOT in the trusted set", () => {
    const info = run(["10.0.0.1"], "10.0.0.1", fallbackOrigin, {
      "x-forwarded-for": "9.9.9.9, 1.2.3.4",
    });

    expect(info.remoteAddr).toBe("1.2.3.4");
    expect(info.remoteAddr).not.toBe("9.9.9.9");
  });

  it("hop-aware: skips a chain of trusted proxies to the first untrusted hop", () => {
    const info = run(["10.0.0.1", "10.0.0.2"], "10.0.0.1", fallbackOrigin, {
      "x-forwarded-for": "1.2.3.4, 10.0.0.2",
    });

    expect(info.remoteAddr).toBe("1.2.3.4");
  });

  it("hop-aware proto/host: only the trusted peer's appended entry is honored", () => {
    const info = run(["10.0.0.1"], "10.0.0.1", fallbackOrigin, {
      "x-forwarded-for": "9.9.9.9, 1.2.3.4",
      "x-forwarded-proto": "https, http",
      "x-forwarded-host": "spoofed.example, real.example",
    });

    const url = new URL(info.publicOrigin);
    expect(url.protocol).toBe("http:");
    expect(url.host).toBe("real.example");
  });

  it("untrusted peer -> X-Forwarded-For (and proto/host) ignored entirely", () => {
    const info = run(["10.0.0.1"], "203.0.113.7", fallbackOrigin, {
      "x-forwarded-for": "1.2.3.4, 10.0.0.1",
      "x-forwarded-proto": "https",
      "x-forwarded-host": "public.example",
    });
    const url = new URL(info.publicOrigin);

    expect(info.remoteAddr).toBe("203.0.113.7");
    expect(url.host).toBe("origin.example");
    expect(url.protocol).toBe("http:");
  });

  it("X-Forwarded-Host without a port drops the listener port", () => {
    const info = run(true, "10.0.0.1", fallbackOrigin, {
      "x-forwarded-host": "public.example",
    });

    expect(new URL(info.publicOrigin).host).toBe("public.example");
  });

  it("X-Forwarded-Host may carry its own port", () => {
    const info = run(true, "10.0.0.1", fallbackOrigin, {
      "x-forwarded-host": "public.example:8443",
    });
    const url = new URL(info.publicOrigin);

    expect(url.hostname).toBe("public.example");
    expect(url.port).toBe("8443");
  });

  it("a malformed X-Forwarded-Host is ignored and keeps the original host:port", () => {
    const info = run(true, "10.0.0.1", "http://origin.example:34697/", {
      "x-forwarded-host": "bad host",
    });
    const url = new URL(info.publicOrigin);

    expect(url.hostname).toBe("origin.example");
    expect(url.port).toBe("34697");
  });

  it("honors the leftmost entry of a comma-joined X-Forwarded-Proto", () => {
    const info = run(true, "10.0.0.1", fallbackOrigin, {
      "x-forwarded-proto": "https, http",
    });

    expect(new URL(info.publicOrigin).protocol).toBe("https:");
  });
});
