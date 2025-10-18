# @resolid/di

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
