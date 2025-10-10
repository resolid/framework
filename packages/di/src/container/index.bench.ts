import { beforeEach, bench, describe } from "vitest";
import { type Container, createContainer } from "./index";

describe("Container Benchmark", () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  bench("toValue resolve (singleton)", async () => {
    const TEST = Symbol("toValue");
    container.bind(TEST).toValue({ foo: "bar" });

    await container.resolve(TEST);
  });

  bench("toFunction resolve (singleton)", async () => {
    const TEST = Symbol("toFunction");
    const fn = () => 42;
    container.bind(TEST).toFunction(fn);

    const resolved = await container.resolve<() => number>(TEST);
    resolved();
  });

  bench("toFactory resolve (singleton)", async () => {
    const TEST = Symbol("toFactory");
    container.bind(TEST).toFactory(() => ({ value: Math.random() }));

    await container.resolve(TEST);
  });

  bench("toFactory resolve (transient)", async () => {
    const TEST = Symbol("transientFactory");
    container.bind(TEST).toFactory(() => ({ value: Math.random() }), { scope: "transient" });

    await container.resolve(TEST);
    await container.resolve(TEST);
  });

  bench("async factory resolve", async () => {
    const TEST = Symbol("asyncFactory");

    container.bind(TEST).toFactory(async () => {
      await new Promise((r) => setTimeout(r, 1));
      return { async: true };
    });

    await container.resolve(TEST);
  });

  bench("deep dependency chain", async () => {
    const A = Symbol("A");
    const B = Symbol("B");
    const C = Symbol("C");

    container.bind(C).toFactory(() => ({ value: "C" }));

    container.bind(B).toFactory(async ({ resolver }) => {
      const c = await resolver.resolve(C);
      return { c };
    });

    container.bind(A).toFactory(async ({ resolver }) => {
      const b = await resolver.resolve(B);
      return { b };
    });

    await container.resolve(A);
  });

  bench("lazyResolve access after resolve", async () => {
    const TEST = Symbol("lazyTest");

    container.bind(TEST).toValue({ value: 123 });

    const lazyRef = container.lazyResolve(TEST);
    await container.resolve(TEST);

    // noinspection JSUnusedLocalSymbols
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const val = lazyRef.value;
  });
});
