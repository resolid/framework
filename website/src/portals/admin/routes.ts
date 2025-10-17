import { prefix, relativeFactory } from "@resolid/dev/routes";

const { index, layout } = relativeFactory(import.meta.dirname);

export default prefix("admin", [layout("./layout.tsx", [index("./home/index.tsx")])]);
