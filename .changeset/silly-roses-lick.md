---
"@resolid/di": minor
---

feat: singleton and use string keys for HMR

- Make DI singleton HMR-friendly in development
- Switch binding keys from Symbol to string to prevent HMR issues
