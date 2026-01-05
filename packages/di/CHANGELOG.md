# @resolid/di

## 0.7.1

### Patch Changes

- update package export ([`bb0ba1c`](https://github.com/resolid/framework/commit/bb0ba1c86c4d6aebedbaaca64423f04e529ee315))

## 0.7.0

### Minor Changes

- refactor: remove async support and simplify container ([`04c0057`](https://github.com/resolid/framework/commit/04c0057178017dc05c6b04d67afbcef9acb87666))

## 0.6.1

### Patch Changes

- feat: support abstract class tokens in Token type ([`a82a0dd`](https://github.com/resolid/framework/commit/a82a0dd45477baacc81c7e32c39bdd11d57914f7))

## 0.6.0

### Minor Changes

- ## Features ([`21cdb36`](https://github.com/resolid/framework/commit/21cdb36989650216bec4fc46da0f22f74e68910d))
  - **di:** refactor of dependency injection container
    - Rewritten container core with async provider support
    - Added injection context handling
    - Unified get / getAsync logic with improved type safety
    - Simplified extension registration mechanism

  ### BREAKING CHANGES
  - Old provider registration and resolution APIs are no longer compatible
  - Container instances must now use async initialization for async dependencies

## 0.5.1

### Patch Changes

- refactor: remove globalThis singleton ([`07eb17a`](https://github.com/resolid/framework/commit/07eb17aa6e7f695f98c5b4bd27c047b365917903))

## 0.5.0

### Minor Changes

- pref: optimize container performance and reduce microtasks ([`a122de4`](https://github.com/resolid/framework/commit/a122de49c3848daa98904404499e0d6fd3a5e528))

## 0.4.0

### Minor Changes

- feat: singleton and use string keys for HMR ([`21962ff`](https://github.com/resolid/framework/commit/21962ff57cae083cb393cafa9516cb1dbe3af76a))
  - Make DI singleton HMR-friendly in development
  - Switch binding keys from Symbol to string to prevent HMR issues

## 0.3.2

### Patch Changes

- chore: update package version ([`87ddc62`](https://github.com/resolid/framework/commit/87ddc620cd86b1b965115be520574d948044ae1d))

## 0.3.1

### Patch Changes

- refactor: adjust exported types ([`76132a4`](https://github.com/resolid/framework/commit/76132a4ea15ca58736b544d6a4bc7bd62ea25819))

## 0.3.0

### Minor Changes

- remove container bind method ([`31ba7bc`](https://github.com/resolid/framework/commit/31ba7bc487613fa11c524a871c11bad654b38976))

  **BREAKING CHANGE**: container bind method is removed. Bindings must now be passed to createContainer

## 0.2.2

### Patch Changes

- refactor: make lazyResolve internal ([`ab56fbd`](https://github.com/resolid/framework/commit/ab56fbd95526f0802f4e81f1a0c59e603fb59678))

## 0.2.1

### Patch Changes

- chore: improve package metadata and build config ([`03ec558`](https://github.com/resolid/framework/commit/03ec558fa8bad36f7f89f9d9056487bf3ea48893))

## 0.2.0

### Minor Changes

- feat: use class-based container with private fields ([`0508f4b`](https://github.com/resolid/framework/commit/0508f4b83283a9327bea7f239ebeaec57fd3dd9d))

## 0.1.1

### Patch Changes

- chore: enable bundle minify and support Node 20.19+ ([`05de66a`](https://github.com/resolid/framework/commit/05de66a50fb03a9fe43f45b78512491c8ec0cd56))

## 0.1.0

### Minor Changes

- feat: initial public release ([`5c9c120`](https://github.com/resolid/framework/commit/5c9c1204cec05313429dc06d8821dc07594a7c2f))
