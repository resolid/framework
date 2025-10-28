---
"@resolid/di": minor
---

## Features

- **di:** refactor of dependency injection container
  - Rewritten container core with async provider support
  - Added injection context handling
  - Unified get / getAsync logic with improved type safety
  - Simplified extension registration mechanism

### BREAKING CHANGES

- Old provider registration and resolution APIs are no longer compatible
- Container instances must now use async initialization for async dependencies
