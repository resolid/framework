import { relativeFactory } from "@resolid/dev/routes";

const { index, layout } = relativeFactory(import.meta.dirname);

export default [layout("./layout.tsx", [index("./home/index.tsx")])];
