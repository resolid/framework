import type { CacheStore } from "../types";

export const nullCache: Required<CacheStore> = {
  get: async () => {
    return undefined;
  },
  set: async () => {
    return true;
  },
  del: async () => {
    return true;
  },
  clear: async () => {
    return true;
  },

  getMultiple: async (keys) => {
    return keys.map(() => undefined);
  },
  setMultiple: async () => {
    return true;
  },
  delMultiple: async () => {
    return true;
  },

  has: async () => {
    return false;
  },

  dispose: async () => {
    return;
  },
};
