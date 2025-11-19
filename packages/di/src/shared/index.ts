export type Token<T = unknown> =
  | symbol
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | (new (...args: any[]) => T)
  | {
      prototype: T;
      name: string;
    };

export function toString<T>(token: Token<T>): string {
  if (typeof token === "symbol") {
    return token.description ?? String(token);
  } else {
    return token.name;
  }
}

export interface Disposable {
  dispose: () => Promise<void> | void;
}

export interface Resolver {
  get: (<T>(token: Token<T>) => T) &
    (<T>(token: Token<T>, options: { optional: true }) => T | undefined) &
    (<T>(token: Token<T>, options: { lazy: true }) => () => T) &
    (<T>(token: Token<T>, options: { lazy: true; optional: true }) => () => T | undefined) &
    (<T>(token: Token<T>, options: { lazy?: false; optional?: boolean }) => T | undefined) &
    (<T>(
      token: Token<T>,
      options?: { lazy?: boolean; optional?: boolean },
    ) => T | undefined | (() => T | undefined));

  getAsync: (<T>(token: Token<T>) => Promise<T>) &
    (<T>(token: Token<T>, options: { optional: true }) => Promise<T | undefined>) &
    (<T>(token: Token<T>, options: { lazy: true }) => () => Promise<T>) &
    (<T>(
      token: Token<T>,
      options: { lazy: true; optional: true },
    ) => () => Promise<T | undefined>) &
    (<T>(
      token: Token<T>,
      options: { lazy?: false; optional?: boolean },
    ) => Promise<T | undefined>) &
    (<T>(
      token: Token<T>,
      options?: { lazy?: boolean; optional?: boolean },
    ) => Promise<T | undefined> | (() => Promise<T | undefined>));
}
