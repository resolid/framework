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
import { platform } from "~/foundation/platform.server";

export function configure<E extends Env>(hono: Hono<E>) {
  hono.use(
    clientIp(
      platform == "netlify"
        ? netlifyClientIpGetter()
        : platform == "vercel"
          ? vercelClientIpGetter()
          : nodeClientIpGetter(),
    ),
  );
  hono.use(
    requestId(
      platform == "netlify"
        ? netlifyRequestIdGenerator()
        : platform == "vercel"
          ? vercelRequestIdGenerator()
          : undefined,
    ),
  );
  hono.use(
    requestOrigin(
      platform == "netlify"
        ? netlifyRequestOriginGetter()
        : platform == "vercel"
          ? vercelRequestOriginGetter()
          : nodeRequestOriginGetter(),
    ),
  );
}
