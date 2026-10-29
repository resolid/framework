import type { BuildManifest } from "@react-router/dev/config";

export type BundleInfo = {
  id: string;
  prefix: string;
};

export function getServerBundleInfos(
  manifest: BuildManifest | null,
  basename: string,
): BundleInfo[] {
  if (!manifest?.routeIdToServerBundleId) {
    return [{ id: "site", prefix: basename }];
  }

  const { routes, routeIdToServerBundleId } = manifest;

  const resolveSegments = (id: string): string[] => {
    const route = routes[id]!;
    const parent = route.parentId ? resolveSegments(route.parentId) : [];
    return route.path ? [...parent, ...route.path.split("/").filter(Boolean)] : parent;
  };

  const grouped: Record<string, string[][]> = {};

  for (const [routeId, bundleId] of Object.entries(routeIdToServerBundleId)) {
    (grouped[bundleId] ??= []).push(resolveSegments(routeId));
  }

  return Object.entries(grouped)
    .map(([id, list]) => {
      // oxlint-disable-next-line unicorn/no-array-reduce
      const common = list.reduce((prefix, segs) => {
        let i = 0;
        while (i < prefix.length && prefix[i] === segs[i]) {
          i++;
        }
        return prefix.slice(0, i);
      });

      return { id, prefix: joinPath(basename, common.join("/")) };
    })
    .sort((a, b) => b.prefix.length - a.prefix.length);
}

export function joinPath(...parts: string[]): string {
  return `/${parts.flatMap((p) => p.split("/").filter(Boolean)).join("/")}`;
}
