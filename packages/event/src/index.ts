type Callback<Args extends unknown[] = unknown[]> = (...args: Args) => void;

export type Emitter = {
  on: <Args extends unknown[]>(event: string, callback: Callback<Args>) => () => void;
  off: <Args extends unknown[]>(event: string, callback: Callback<Args>) => void;
  offAll: (event?: string) => void;
  once: <Args extends unknown[]>(event: string, callback: Callback<Args>) => void;
  emit: <Args extends unknown[]>(event: string, ...args: Args) => void;
  emitAsync: <Args extends unknown[]>(event: string, ...args: Args) => void;
};

export const createEmitter = (): Emitter => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const _events: Record<string, Callback<any>[]> = Object.create(null);

  const on = <Args extends unknown[]>(event: string, callback: Callback<Args>): (() => void) => {
    (_events[event] ??= []).push(callback);

    return () => {
      off(event, callback);
    };
  };

  const off = <Args extends unknown[]>(event: string, callback: Callback<Args>): void => {
    if (!_events[event]) {
      return;
    }

    _events[event] = _events[event]?.filter((cb) => callback !== cb);
  };

  const offAll = (event?: string): void => {
    if (event) {
      delete _events[event];
    } else {
      for (const key in _events) {
        delete _events[key];
      }
    }
  };

  const once = <Args extends unknown[]>(event: string, callback: Callback<Args>): void => {
    const wrapper: Callback<Args> = (...args) => {
      callback(...args);
      off(event, wrapper);
    };

    on(event, wrapper);
  };

  const emit = <Args extends unknown[]>(event: string, ...args: Args): void => {
    for (let callbacks = _events[event] || [], i = 0, length = callbacks.length; i < length; i++) {
      callbacks[i](...args);
    }
  };

  const emitAsync = <Args extends unknown[]>(event: string, ...args: Args) => {
    /* istanbul ignore next -- @preserve */
    const callbacks = _events[event]?.slice() || [];

    queueMicrotask(() => {
      for (let i = 0, length = callbacks.length; i < length; i++) {
        callbacks[i](...args);
      }
    });
  };

  return {
    on,
    off,
    offAll,
    once,
    emit,
    emitAsync,
  };
};
