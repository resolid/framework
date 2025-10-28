type Callback<Args extends unknown[] = unknown[]> = (...args: Args) => void;

export class Emitter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly _events = new Map<string, Callback<any>[]>();

  on<Args extends unknown[]>(event: string, callback: Callback<Args>): () => void {
    let callbacks = this._events.get(event);

    if (!callbacks) {
      callbacks = [];
      this._events.set(event, callbacks);
    }

    callbacks.push(callback);

    return () => this.off(event, callback);
  }

  off<Args extends unknown[]>(event: string, callback: Callback<Args>): void {
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

  offAll(event?: string): void {
    if (event) {
      this._events.delete(event);
    } else {
      this._events.clear();
    }
  }

  once<Args extends unknown[]>(event: string, callback: Callback<Args>): void {
    const wrapper: Callback<Args> = (...args) => {
      callback(...args);
      this.off(event, wrapper);
    };

    this.on(event, wrapper);
  }

  emit<Args extends unknown[]>(event: string, ...args: Args): void {
    const callbacks = this._events.get(event);

    if (!callbacks) {
      return;
    }

    const len = callbacks.length;

    for (let i = 0; i < len; i++) {
      callbacks[i](...args);
    }
  }

  emitAsync<Args extends unknown[]>(event: string, ...args: Args): void {
    const callbacks = this._events.get(event);

    /* istanbul ignore if -- @preserve */
    if (!callbacks || callbacks.length === 0) {
      return;
    }

    queueMicrotask(() => {
      const len = callbacks.length;

      for (let i = 0; i < len; i++) {
        callbacks[i](...args);
      }
    });
  }
}
