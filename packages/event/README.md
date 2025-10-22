# Resolid: Event Package

![GitHub License](https://img.shields.io/github/license/resolid/framework)
![NPM Version](https://img.shields.io/npm/v/%40resolid/event)

<b>[Documentation](https://www.resolid.tech/docs/event)</b> | [Framework Bundle](https://github.com/resolid/framework)

## Lightweight, Typed Event System for TypeScript

A lightweight, fully typed event emitter for modern TypeScript projects.
Provides a clean API, async emission, and zero dependencies — perfect for libraries and frameworks.

### Feature

- Fully typed with TypeScript, no any.
- Provides simple `on`, `off`, `once`, and `emit` APIs.
- Supports async emission via `emitAsync`.
- Removes listeners automatically for `once` handlers.
- Zero dependencies and minimal footprint.

### Installation

```shell
pnpm add @resolid/event
# or
npm install @resolid/event
# or
yarn add @resolid/event
# or
bun add @resolid/event
```

### Usage

#### Basic

```js
import { createEmitter } from "@resolid/event";

const emitter = createEmitter();

emitter.on("hello", (name: string) => {
  console.log(`Hello, ${name}!`);
});

emitter.emit("hello", "World"); // -> "Hello, World!"
```

#### Once Listener

```js
import { createEmitter } from "@resolid/event";

const emitter = createEmitter();

emitter.once("ready", (msg: string) => {
  console.log(msg);
});

emitter.emit("ready", "First call");  // -> "First call"
emitter.emit("ready", "Second call"); // won't trigger again
```

#### Async Emission

```js
import { createEmitter } from "your-package-name";

const emitter = createEmitter();

emitter.on("done", () => {
  console.log("Event handled (after all sync code)");
});

console.log("Before emitAsync");

emitter.emitAsync("done");

console.log("After emitAsync");

// output
// Before emitAsync
// After emitAsync
// Event handled (after all sync code)
```

## License

MIT License (MIT). Please see [LICENSE](./LICENSE) for more information.
