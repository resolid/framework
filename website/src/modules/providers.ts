import type { Provider } from "@resolid/core";

const modules = import.meta.glob<Provider>("./**/repository.server.ts", {
  import: "serviceProvider",
  eager: true,
});

export const moduleProviders = Object.values(modules);
