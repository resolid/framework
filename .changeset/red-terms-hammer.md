---
"@resolid/dev": minor
---

refactor!: replace getHonoContext with getRouteContext

getRouteContext returns the Hono variable map plus `env` instead of the whole
Hono context, so route code destructures `const { app, requestId } = getRouteContext(ctx)`.

Also accept a null build manifest and support Node 26.
