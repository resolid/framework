import type { OxfmtConfig } from "oxfmt";
import { oxfmtConfig } from "@resolid/config/oxfmt";

export default oxfmtConfig({
  sortTailwindcss: {
    stylesheet: "./website/src/root.css",
    functions: ["tx", "tv"],
    preserveWhitespace: true,
  },
}) as OxfmtConfig;
