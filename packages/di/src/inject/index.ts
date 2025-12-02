import { InjectionContext, InjectionContextError } from "../context";
import type { Token } from "../shared";

export function inject<T>(token: Token<T>): T;
export function inject<T>(token: Token<T>, options: { optional: true }): T | undefined;
export function inject<T>(token: Token<T>, options: { lazy: true }): () => T;
export function inject<T>(
  token: Token<T>,
  options: { lazy: true; optional: true },
): () => T | undefined;
export function inject<T>(
  token: Token<T>,
  options?: { lazy?: boolean; optional?: boolean },
): T | undefined | (() => T | undefined) {
  try {
    return InjectionContext.current().run((resolver) => resolver.get(token, options));
  } catch (error) {
    if (error instanceof InjectionContextError && options?.optional == true) {
      return undefined;
    }

    throw error;
  }
}
