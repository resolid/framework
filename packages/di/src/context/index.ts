import type { Resolver } from "../shared";

export class InjectionContextError extends Error {
  constructor() {
    super("inject() / injectAsync() must be called within a injection context");
  }
}

export class InjectionContext {
  private static contextStack: InjectionContext[] = [];
  private readonly resolver: Resolver;

  constructor(resolver: Resolver) {
    this.resolver = resolver;
  }

  static current(): InjectionContext {
    const ctx = this.contextStack[this.contextStack.length - 1];

    if (ctx === undefined) {
      throw new InjectionContextError();
    }

    return ctx;
  }

  run<T>(block: (resolver: Resolver) => T): T {
    InjectionContext.contextStack.push(this);
    try {
      return block(this.resolver);
    } finally {
      InjectionContext.contextStack.pop();
    }
  }

  async runAsync<T>(block: (resolver: Resolver) => Promise<T>): Promise<T> {
    InjectionContext.contextStack.push(this);
    try {
      return await block(this.resolver);
    } finally {
      InjectionContext.contextStack.pop();
    }
  }
}
