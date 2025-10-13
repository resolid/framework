import eslintNode from "@resolid/config/eslint.node";
import eslintTypescript from "@resolid/config/eslint.typescript";

/** @type {import("eslint").Linter.Config[]} */
export default [...eslintTypescript, ...eslintNode];
