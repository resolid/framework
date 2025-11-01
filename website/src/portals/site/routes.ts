import { relativeFactory } from "@resolid/dev/routes";

const { index, layout, route } = relativeFactory(import.meta.dirname);

export default [layout("./layout.tsx", [index("./home/index.tsx"), route("status", "./home/status.tsx")])];
