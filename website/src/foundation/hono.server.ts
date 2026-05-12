import {
  clientIp,
  netlifyClientIpGetter,
  netlifyRequestIdGenerator,
  netlifyRequestOriginGetter,
  nodeClientIpGetter,
  nodeRequestOriginGetter,
  requestId,
  requestOrigin,
  vercelClientIpGetter,
  vercelRequestIdGenerator,
  vercelRequestOriginGetter,
  type Env,
  type Hono,
} from "@resolid/dev/http.server";

export function configure<E extends Env>(hono: Hono<E>) {
  hono.use(
    clientIp(
      import.meta.env.RESOLID_PLATFORM == "netlify"
        ? netlifyClientIpGetter()
        : import.meta.env.RESOLID_PLATFORM == "vercel"
          ? vercelClientIpGetter()
          : nodeClientIpGetter(),
    ),
  );
  hono.use(
    requestId(
      import.meta.env.RESOLID_PLATFORM == "netlify"
        ? netlifyRequestIdGenerator()
        : import.meta.env.RESOLID_PLATFORM == "vercel"
          ? vercelRequestIdGenerator()
          : undefined,
    ),
  );
  hono.use(
    requestOrigin(
      import.meta.env.RESOLID_PLATFORM == "netlify"
        ? netlifyRequestOriginGetter()
        : import.meta.env.RESOLID_PLATFORM == "vercel"
          ? vercelRequestOriginGetter()
          : nodeRequestOriginGetter(),
    ),
  );
}
