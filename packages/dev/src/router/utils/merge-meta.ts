import type { MetaDescriptor } from "react-router";

// oxlint-disable-next-line typescript/no-explicit-any
export function mergeMeta<A extends { matches: any[] }>(
  metaFn: (args: A) => MetaDescriptor[],
  titleJoin = " - ",
): (args: A) => MetaDescriptor[] {
  return (args) => {
    const leafMeta = metaFn(args);

    const mergedMeta = args.matches.reduceRight((acc, match) => {
      for (const parentMeta of match.meta) {
        const index = acc.findIndex((meta: MetaDescriptor) => {
          if ("name" in meta && "name" in parentMeta) {
            return meta.name === parentMeta.name;
          }

          if ("property" in meta && "property" in parentMeta) {
            return meta.property === parentMeta.property;
          }

          if ("title" in meta && "title" in parentMeta) {
            return meta.title === parentMeta.title;
          }

          return false;
        });

        if (index == -1) {
          acc.push(parentMeta);
        }
      }

      return acc;
    }, leafMeta);

    const titles: string[] = [];
    const result: MetaDescriptor[] = [];

    for (const meta of mergedMeta) {
      if ("title" in meta) {
        if (typeof meta.title === "string" && meta.title.length > 0) {
          titles.push(...meta.title.split(titleJoin));
        }
      } else {
        result.push(meta);
      }
    }

    result.unshift({ title: [...new Set(titles)].join(titleJoin) });

    return result;
  };
}
