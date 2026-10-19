import { getAppDirectory, index, layout, route } from "@react-router/dev/routes";
import nodePath from "node:path";

export function relativeFactory(directory: string): {
  route: typeof route;
  index: typeof index;
  layout: typeof layout;
} {
  const appDirectory = getAppDirectory();

  const resolve = (file: string) =>
    nodePath.relative(appDirectory, nodePath.resolve(directory, file));

  return {
    // The `rest` spread is cast because TypeScript cannot resolve the overloaded helper signatures here.
    route: (path, file, ...rest) =>
      // oxlint-disable-next-line typescript/no-explicit-any
      route(path, resolve(file), ...(rest as any)),
    // oxlint-disable-next-line typescript/no-explicit-any
    index: (file, ...rest) => index(resolve(file), ...(rest as any)),
    // oxlint-disable-next-line typescript/no-explicit-any
    layout: (file, ...rest) => layout(resolve(file), ...(rest as any)),
  };
}
