export type EventType = string | symbol;

export type Callback<Args extends unknown[] = unknown[]> = (...args: Args) => void;

// oxlint-disable-next-line typescript/no-explicit-any
export class Emitter<Events extends Record<EventType, any> = Record<EventType, any>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly _events: Map<keyof Events, Callback<any>[]> = new Map();

  on<K extends keyof Events>(event: K, callback: Callback<Events[K]>): () => void {
    let callbacks = this._events.get(event);

    if (!callbacks) {
      callbacks = [];
      this._events.set(event, callbacks);
    }

    callbacks.push(callback);

    return () => this.off(event, callback);
  }

  once<K extends keyof Events>(event: K, callback: Callback<Events[K]>): void {
    const wrapper: Callback<Events[K]> = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };

    this.on(event, wrapper);
  }

  off<K extends keyof Events>(event: K, callback: Callback<Events[K]>): void {
    const callbacks = this._events.get(event);

    if (!callbacks) {
      return;
    }

    for (let i = callbacks.length - 1; i >= 0; i--) {
      if (callbacks[i] === callback) {
        callbacks.splice(i, 1);
        break;
      }
    }

    if (callbacks.length === 0) {
      this._events.delete(event);
    }
  }

  offAll<K extends keyof Events>(event?: K): void {
    if (event === undefined) {
      this._events.clear();
    } else {
      this._events.delete(event);
    }
  }

  emit<K extends keyof Events>(event: K, ...args: Events[K]): void {
    const callbacks = this._events.get(event);

    if (!callbacks) {
      return;
    }

    if (callbacks.length === 1) {
      callbacks[0]!(...(args as unknown[]));
      return;
    }

    // oxlint-disable-next-line unicorn/no-useless-spread, unicorn/prefer-spread
    for (const callback of [...callbacks]) {
      callback(...(args as unknown[]));
    }
  }

  emitAsync<K extends keyof Events>(event: K, ...args: Events[K]): void {
    const callbacks = this._events.get(event);

    /* istanbul ignore if -- @preserve */
    if (!callbacks || callbacks.length === 0) {
      return;
    }

    // oxlint-disable-next-line unicorn/prefer-spread
    const snapshot = [...callbacks];

    queueMicrotask(() => {
      for (const callback of snapshot) {
        callback(...(args as unknown[]));
      }
    });
  }
}
