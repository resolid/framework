import type { ServiceProvider } from "@resolid/core";

const modules = import.meta.glob<ServiceProvider>("./**/repository.server.ts", {
  import: "serviceProvider",
  eager: true,
});

export const moduleProviders = Object.values(modules);
