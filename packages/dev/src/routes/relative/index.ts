import { getAppDirectory, index, layout, route } from "@react-router/dev/routes";
import { relative, resolve } from "node:path";

export function relativeFactory(directory: string): {
  route: typeof route;
  index: typeof index;
  layout: typeof layout;
} {
  const appDirectory = getAppDirectory();

  return {
    route: (path, file, ...rest) =>
      route(
        path,
        relative(appDirectory, resolve(directory, file)),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(rest as any),
      ),

    index: (file, ...rest) =>
      index(
        relative(appDirectory, resolve(directory, file)),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(rest as any),
      ),

    layout: (file, ...rest) =>
      layout(
        relative(appDirectory, resolve(directory, file)),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(rest as any),
      ),
  };
}
