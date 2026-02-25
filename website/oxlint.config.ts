import browserConfig from "@resolid/config/oxlint/browser";
import nodeConfig from "@resolid/config/oxlint/node";
import reactConfig from "@resolid/config/oxlint/react";
import typescriptConfig from "@resolid/config/oxlint/typescript";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [typescriptConfig, reactConfig, browserConfig, nodeConfig],
});
