import type { MetaArgs, MetaDescriptor } from "react-router";

export function mergeMeta(metaFn: (arg: MetaArgs) => MetaDescriptor[], titleJoin = " - ") {
  return (arg: MetaArgs): MetaDescriptor[] => {
    const leafMeta = metaFn(arg);

    const mergedMeta = arg.matches.reduceRight((acc, match) => {
      if (match) {
        for (const parentMeta of match.meta) {
          const index = acc.findIndex((meta) => {
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
      }

      return acc;
    }, leafMeta);

    const titles: string[] = [];
    const result: MetaDescriptor[] = [];

    for (const meta of mergedMeta) {
      if ("title" in meta) {
        // noinspection SuspiciousTypeOfGuard
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
