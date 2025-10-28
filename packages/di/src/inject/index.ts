import { InjectionContext, InjectionContextError } from "../context";
import type { Token } from "../shared";

export function inject<T>(token: Token<T>): T;
export function inject<T>(token: Token<T>, options: { optional: true }): T | undefined;
export function inject<T>(token: Token<T>, options: { lazy: true }): () => T;
export function inject<T>(token: Token<T>, options: { lazy: true; optional: true }): () => T | undefined;
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

export function injectAsync<T>(token: Token<T>): Promise<T>;
export function injectAsync<T>(token: Token<T>, options: { optional: true }): Promise<T | undefined>;
export function injectAsync<T>(token: Token<T>, options: { lazy: true }): () => Promise<T>;
export function injectAsync<T>(token: Token<T>, options: { lazy: true; optional: true }): () => Promise<T | undefined>;
export function injectAsync<T>(
  token: Token<T>,
  options?: { lazy?: boolean; optional?: boolean },
): Promise<T | undefined> | (() => Promise<T | undefined>) {
  try {
    if (options?.lazy) {
      return InjectionContext.current().run((resolver) => resolver.getAsync(token, { ...options, lazy: true }));
    }

    return InjectionContext.current().runAsync((resolver) => resolver.getAsync(token, { ...options, lazy: false }));
  } catch (error) {
    if (error instanceof InjectionContextError && options?.optional === true) {
      if (options?.lazy) {
        return () => Promise.resolve(undefined);
      }
      return Promise.resolve(undefined);
    }

    return Promise.reject(error);
  }
}
