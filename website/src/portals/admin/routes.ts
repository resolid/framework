import { prefix, relativeFactory } from "@resolid/dev/routes";

const { index, route, layout } = relativeFactory(import.meta.dirname);

export default prefix("admin", [
  layout("./layout.tsx", [
    index("./home/index.tsx"),
    route("*", "../catchall.tsx", { id: "admin-not-found-page" }),
  ]),
]);
