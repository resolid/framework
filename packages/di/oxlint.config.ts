import nodeConfig from "@resolid/config/oxlint/node";
import typescriptConfig from "@resolid/config/oxlint/typescript";
import { defineConfig, type OxlintConfig } from "oxlint";

export default defineConfig({
  extends: [typescriptConfig, nodeConfig],
}) as OxlintConfig;
