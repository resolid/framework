import {
  getAppDirectory,
  index,
  layout,
  route,
  type RouteConfigEntry,
} from "@react-router/dev/routes";
import { relative, resolve } from "node:path";

export { prefix, type RouteConfig } from "@react-router/dev/routes";

export { index, layout, route };

export type { RouteConfigEntry };

export const relativeFactory = (
  directory: string,
): {
  route: typeof route;
  index: typeof index;
  layout: typeof layout;
} => {
  const appDirectory = getAppDirectory();

  return {
    route: (path, file, ...rest) => {
      return route(
        path,
        relative(appDirectory, resolve(directory, file)),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(rest as any),
      );
    },

    index: (file, ...rest) => {
      return index(
        relative(appDirectory, resolve(directory, file)),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(rest as any),
      );
    },

    layout: (file, ...rest) => {
      return layout(
        relative(appDirectory, resolve(directory, file)),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(rest as any),
      );
    },
  };
};
