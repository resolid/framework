export type EventType = string | symbol;

type Callback<Args extends unknown[] = unknown[]> = (...args: Args) => void;

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
    if (event) {
      this._events.delete(event);
    } else {
      this._events.clear();
    }
  }

  once<K extends keyof Events>(event: K, callback: Callback<Events[K]>): void {
    const wrapper: Callback<Events[K]> = (...args) => {
      callback(...args);
      this.off(event, wrapper);
    };

    this.on(event, wrapper);
  }

  emit<K extends keyof Events>(event: K, ...args: Events[K]): void {
    const callbacks = this._events.get(event);

    if (!callbacks) {
      return;
    }

    for (const callback of callbacks) {
      callback(...(args as unknown[]));
    }
  }

  emitAsync<K extends keyof Events>(event: K, ...args: Events[K]): void {
    const callbacks = this._events.get(event);

    /* istanbul ignore if -- @preserve */
    if (!callbacks || callbacks.length === 0) {
      return;
    }

    queueMicrotask(() => {
      for (const callback of callbacks) {
        callback(...(args as unknown[]));
      }
    });
  }
}
