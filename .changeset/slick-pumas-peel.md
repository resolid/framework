---
"@resolid/dev": minor
---

refactor!: resolve client address and public origin with trustProxy

Replace the `proxy`, `proxyCount` and `ipHeaders` node options with `trustProxy`,
which walks the `X-Forwarded-For` chain and aligns `X-Forwarded-Proto` and
`X-Forwarded-Host` with the client entry.

- merge the `remoteAddr` and `requestOrigin` middlewares into `requestInfo`, and
  expose `publicOrigin` as a non-optional context variable
- add a `hostname` option to the node server and bound graceful shutdown with a
  timeout that force-closes remaining connections
- rename `httpProblem` to `validationError` and `utils/response` to `utils/responses`
