---
"@resolid/dev": minor
---

refactor!: make server creation synchronous

- remove async/await from createHonoServer and the platform creators
- return the Netlify handler directly instead of accepting a handle option

BREAKING CHANGE: createHonoNetlifyServer no longer accepts `handle`, and all createHono*Server functions now return synchronously.
