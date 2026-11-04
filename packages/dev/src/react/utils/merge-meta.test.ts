import type { MetaDescriptor } from "react-router";
import { describe, expect, expectTypeOf, it } from "vitest";
import { mergeMeta } from "./merge-meta";

describe("mergeMeta", () => {
  it("should merge parent meta and leaf meta", () => {
    const fn = mergeMeta(() => [{ name: "description", content: "leaf description" }]);

    const result = fn({
      matches: [
        {
          meta: [{ name: "keywords", content: "parent" }],
        },
      ],
    });

    expect(result).toEqual([
      {
        title: "",
      },
      {
        name: "description",
        content: "leaf description",
      },
      {
        name: "keywords",
        content: "parent",
      },
    ]);
  });

  it("should remove duplicated name meta and keep leaf meta", () => {
    const fn = mergeMeta(() => [{ name: "description", content: "leaf" }]);

    const result = fn({
      matches: [
        {
          meta: [{ name: "description", content: "parent" }],
        },
      ],
    });

    expect(result).toEqual([
      {
        title: "",
      },
      {
        name: "description",
        content: "leaf",
      },
    ]);
  });

  it("should merge titles with titleJoin", () => {
    const fn = mergeMeta(() => [{ title: "Home" }]);

    const result = fn({
      matches: [
        {
          meta: [{ title: "Dashboard" }],
        },
        {
          meta: [{ title: "Admin" }],
        },
      ],
    });

    expect(result).toEqual([
      {
        title: "Home - Admin - Dashboard",
      },
    ]);
  });

  it("should remove duplicated titles", () => {
    const fn = mergeMeta(() => [{ title: "Home - Dashboard" }]);

    const result = fn({
      matches: [
        {
          meta: [{ title: "Dashboard" }],
        },
      ],
    });

    expect(result).toEqual([
      {
        title: "Home - Dashboard",
      },
    ]);
  });

  it("should merge property meta", () => {
    const fn = mergeMeta(() => [
      {
        property: "og:title",
        content: "leaf",
      },
    ]);

    const result = fn({
      matches: [
        {
          meta: [
            {
              property: "og:title",
              content: "parent",
            },
            {
              property: "og:image",
              content: "image",
            },
          ],
        },
      ],
    });

    expect(result).toEqual([
      {
        title: "",
      },
      {
        property: "og:title",
        content: "leaf",
      },
      {
        property: "og:image",
        content: "image",
      },
    ]);
  });

  it("should support custom titleJoin", () => {
    const fn = mergeMeta(() => [{ title: "Home" }], " | ");

    const result = fn({
      matches: [
        {
          meta: [{ title: "Dashboard" }],
        },
      ],
    });

    expect(result).toEqual([
      {
        title: "Home | Dashboard",
      },
    ]);
  });

  it("should accept generated route meta args and keep the function assignable", () => {
    // Mirrors React Router's generated `Route.MetaArgs`, whose `matches` is a tuple
    // with `undefined` entries at the tail.
    type Args = {
      loaderData: { meta: { title: string } };
      matches: [{ meta?: { title: string }[] }, ...({ meta?: { title: string }[] } | undefined)[]];
    };

    type MetaFunction = (args: Args) => MetaDescriptor[];

    const fn: MetaFunction = mergeMeta(({ loaderData }: Args) => [
      {
        title: loaderData.meta.title,
      },
    ]);

    expectTypeOf(fn).toEqualTypeOf<MetaFunction>();
  });
});
