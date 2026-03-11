import type { RouteConfigEntry } from "@react-router/dev/routes";
import { readdir } from "node:fs/promises";
import { extname, join, relative, win32 } from "node:path";

export async function visitFiles(
  dir: string,
  visitor: (file: string) => void,
  base: string = dir,
): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true, encoding: "utf8" });

  await Promise.all(
    entries.map(async (entry) => {
      const filePath = join(dir, entry.name);

      if (entry.isDirectory()) {
        return visitFiles(filePath, visitor, base);
      } else if (entry.isFile()) {
        visitor(relative(base, filePath));
      }
    }),
  );
}

type RouteManifestEntry = {
  path?: string;
  index?: boolean;
  caseSensitive?: boolean;
  id: string;
  parentId?: string;
  file: string;
};

type RouteManifest = {
  [routeId: string]: RouteManifestEntry;
};

export function routeManifestToRouteConfig(
  routeManifest: RouteManifest,
  rootId = "root",
): RouteConfigEntry[] {
  const routeConfigById: {
    [id: string]: Omit<RouteConfigEntry, "id"> & Required<Pick<RouteConfigEntry, "id">>;
  } = {};

  for (const [routeId, route] of Object.entries(routeManifest)) {
    routeConfigById[routeId] = {
      id: route.id,
      file: route.file,
      path: route.path,
      index: route.index,
      caseSensitive: route.caseSensitive,
    };
  }

  const routeConfig: RouteConfigEntry[] = [];

  for (const [, route] of Object.entries(routeConfigById)) {
    const { parentId } = routeManifest[route.id];

    if (parentId === rootId) {
      routeConfig.push(route);
    } else {
      const parentRoute = parentId && routeConfigById[parentId];

      if (parentRoute) {
        parentRoute.children = parentRoute.children || [];
        parentRoute.children.push(route);
      }
    }
  }

  return routeConfig;
}

export function filesToRouteManifest(routesDirectory: string, files: string[]): RouteManifest {
  const routeManifest: RouteManifest = {};
  const routeIds = new Map<string, string>();
  const routeIdConflicts = new Map<string, string[]>();

  for (const file of files) {
    const normalizedFile = normalizeSlashes(join(routesDirectory, file));
    const normalizedFileName = normalizedFile.slice(0, -extname(normalizedFile).length);
    const routeId =
      normalizedFileName.slice(-7) == "_layout"
        ? normalizedFileName.slice(0, -"_layout".length - 1)
        : normalizedFileName;

    const conflict = routeIds.get(routeId);

    if (conflict) {
      const currentConflicts = routeIdConflicts.get(routeId) ?? [conflict];
      currentConflicts.push(normalizedFile);
      routeIdConflicts.set(routeId, currentConflicts);
      continue;
    }

    routeIds.set(routeId, normalizedFile);
  }

  const prefixLookup = new PrefixLookupTrie();
  const sortedRouteIds = Array.from(routeIds).sort(([a], [b]) => b.length - a.length);

  for (const [routeId, file] of sortedRouteIds) {
    const [segments, raw] = getRouteSegments(routeId.slice(routesDirectory.length + 1));
    const index = routeId.slice(-6) == "_index";
    const pathname = createRoutePath(segments, raw, index);

    routeManifest[routeId] = {
      file: file,
      id: routeId,
      path: pathname,
    };

    if (index) {
      routeManifest[routeId].index = true;
    }

    const childRouteIds = prefixLookup.findAndRemove(routeId, (value) => {
      return [".", "/"].includes(value.slice(routeId.length).charAt(0));
    });
    prefixLookup.add(routeId);

    if (childRouteIds.length > 0) {
      for (const childRouteId of childRouteIds) {
        routeManifest[childRouteId].parentId = routeId;
      }
    }
  }

  const parentChildrenMap = new Map<string, RouteManifestEntry[]>();

  for (const [routeId] of sortedRouteIds) {
    const config = routeManifest[routeId];

    if (!config.parentId) {
      continue;
    }

    const existingChildren = parentChildrenMap.get(config.parentId) || [];
    existingChildren.push(config);
    parentChildrenMap.set(config.parentId, existingChildren);
  }

  const uniqueRoutes = new Map<string, RouteManifestEntry>();
  const urlConflicts = new Map<string, RouteManifestEntry[]>();

  for (const [routeId] of sortedRouteIds) {
    const config = routeManifest[routeId];
    const originalPathname = config.path || "";
    const parentConfig = config.parentId ? routeManifest[config.parentId] : null;
    let pathname = config.path;

    if (parentConfig?.path && pathname) {
      pathname = pathname.slice(parentConfig.path.length).replace(/^\//, "").replace(/\/$/, "");
    }

    if (!config.parentId) {
      config.parentId = "root";
    }

    config.path = pathname || undefined;

    const lastRouteSegment = config.id
      .replace(new RegExp(`^${routesDirectory}/`), "")
      .split(/[./]/)
      .pop();

    if (lastRouteSegment && lastRouteSegment[0] == "_" && lastRouteSegment !== "_index") {
      continue;
    }

    const conflictRouteId = originalPathname + (config.index ? "?index" : "");
    const conflict = uniqueRoutes.get(conflictRouteId);

    uniqueRoutes.set(conflictRouteId, config);

    if (conflict && (originalPathname || config.index)) {
      let currentConflicts = urlConflicts.get(originalPathname);
      if (!currentConflicts) {
        currentConflicts = [conflict];
      }
      currentConflicts.push(config);
      urlConflicts.set(originalPathname, currentConflicts);
    }
  }

  if (routeIdConflicts.size > 0) {
    for (const [routeId, files] of routeIdConflicts.entries()) {
      const [taken, ...others] = files;

      const othersRoute = others.map((route) => `⭕ ${route}`).join("\n");

      console.error(
        `!Route ID 冲突: "${routeId}"\n\n下列路由都定义了相同的路由 ID，但只有第一个会生效\n\n🟢 ${taken}\n${othersRoute}\n`,
      );
    }
  }

  if (urlConflicts.size > 0) {
    for (const [path, routes] of urlConflicts.entries()) {
      for (let i = 1; i < routes.length; i++) {
        delete routeManifest[routes[i].id];
      }

      const [taken, ...others] = routes.map((r) => r.file);

      const pathLocal = path[0] == "/" ? path : `/${path}`;
      const othersRoute = others.map((route) => `⭕ ${route}`).join("\n");

      console.error(
        `! Route 路径冲突: "${pathLocal}"\n\n下列路由都定义了相同的 URL，但只有第一个会生效\n\n🟢 ${taken}\n${othersRoute}\n`,
      );
    }
  }

  return routeManifest;
}

const paramPrefixChar = "$";
const escapeStart = "[";
const escapeEnd = "]";
const optionalStart = "(";
const optionalEnd = ")";

type State = "NORMAL" | "ESCAPE" | "OPTIONAL" | "OPTIONAL_ESCAPE";

function getRouteSegments(routeId: string): [string[], string[]] {
  const routeSegments: string[] = [];
  const rawRouteSegments: string[] = [];

  let index = 0;
  let routeSegment = "";
  let rawRouteSegment = "";
  let state: State = "NORMAL";

  const pushRouteSegment = (segment: string, rawSegment: string) => {
    if (!segment) {
      return;
    }

    if (rawSegment.includes("*") || rawSegment.includes(":") || rawSegment.includes("?")) {
      throw new Error("路由文件或目录中不能存在 `*` `:` `?` 特殊字符");
    }

    routeSegments.push(segment);
    rawRouteSegments.push(rawSegment);
  };

  while (index < routeId.length) {
    const char = routeId[index];
    index++;

    switch (state) {
      case "NORMAL": {
        if (char && [".", "/"].includes(char)) {
          pushRouteSegment(routeSegment, rawRouteSegment);
          routeSegment = "";
          rawRouteSegment = "";
          state = "NORMAL";
          break;
        }
        if (char === escapeStart) {
          state = "ESCAPE";
          rawRouteSegment += char;
          break;
        }
        if (char === optionalStart) {
          state = "OPTIONAL";
          rawRouteSegment += char;
          break;
        }
        if (!routeSegment && char == paramPrefixChar) {
          if (index === routeId.length) {
            routeSegment += "*";
            rawRouteSegment += char;
          } else {
            routeSegment += ":";
            rawRouteSegment += char;
          }
          break;
        }

        routeSegment += char;
        rawRouteSegment += char;
        break;
      }
      case "ESCAPE": {
        if (char === escapeEnd) {
          state = "NORMAL";
          rawRouteSegment += char;
          break;
        }

        routeSegment += char;
        rawRouteSegment += char;
        break;
      }
      case "OPTIONAL": {
        if (char === optionalEnd) {
          routeSegment += "?";
          rawRouteSegment += char;
          state = "NORMAL";
          break;
        }

        if (char === escapeStart) {
          state = "OPTIONAL_ESCAPE";
          rawRouteSegment += char;
          break;
        }

        if (!routeSegment && char === paramPrefixChar) {
          if (index === routeId.length) {
            routeSegment += "*";
            rawRouteSegment += char;
          } else {
            routeSegment += ":";
            rawRouteSegment += char;
          }
          break;
        }

        routeSegment += char;
        rawRouteSegment += char;
        break;
      }
      case "OPTIONAL_ESCAPE": {
        if (char === escapeEnd) {
          state = "OPTIONAL";
          rawRouteSegment += char;
          break;
        }

        routeSegment += char;
        rawRouteSegment += char;
        break;
      }
    }
  }

  pushRouteSegment(routeSegment, rawRouteSegment);

  return [routeSegments, rawRouteSegments];
}

function createRoutePath(
  routeSegments: string[],
  rawRouteSegments: string[],
  isIndex?: boolean,
): string | undefined {
  const result: string[] = [];
  const localSegments = isIndex ? routeSegments.slice(0, -1) : routeSegments;

  for (let index = 0; index < localSegments.length; index++) {
    const rawSegment = rawRouteSegments[index];
    let segment = localSegments[index];

    if (segment.startsWith("_") && rawSegment.startsWith("_")) {
      continue;
    }

    if (segment.endsWith("_") && rawSegment.endsWith("_")) {
      segment = segment.slice(0, -1);
    }

    result.push(segment);
  }

  return result.length ? result.join("/") : undefined;
}

const PrefixLookupTrieEndSymbol: unique symbol = Symbol("PrefixLookupTrieEndSymbol");

type PrefixLookupNode = {
  [key: string]: PrefixLookupNode;
} & Record<typeof PrefixLookupTrieEndSymbol, boolean>;

class PrefixLookupTrie {
  root: PrefixLookupNode = {
    [PrefixLookupTrieEndSymbol]: false,
  };

  add(value: string): void {
    if (!value) {
      throw new Error("Cannot add empty string to PrefixLookupTrie");
    }

    let node = this.root;
    for (const char of value) {
      if (!node[char]) {
        node[char] = {
          [PrefixLookupTrieEndSymbol]: false,
        };
      }
      node = node[char];
    }
    node[PrefixLookupTrieEndSymbol] = true;
  }

  findAndRemove(prefix: string, filter: (nodeValue: string) => boolean): string[] {
    let node = this.root;
    for (const char of prefix) {
      if (!node[char]) {
        return [];
      }

      node = node[char];
    }

    return this.#findAndRemoveRecursive([], node, prefix, filter);
  }

  #findAndRemoveRecursive(
    values: string[],
    node: PrefixLookupNode,
    prefix: string,
    filter: (nodeValue: string) => boolean,
  ): string[] {
    for (const char of Object.keys(node)) {
      this.#findAndRemoveRecursive(values, node[char], prefix + char, filter);
    }

    if (node[PrefixLookupTrieEndSymbol] && filter(prefix)) {
      node[PrefixLookupTrieEndSymbol] = false;
      values.push(prefix);
    }

    return values;
  }
}

function normalizeSlashes(file: string): string {
  return file.split(win32.sep).join("/");
}
