import prettierConfig from "@resolid/config/prettier";

/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
const config = {
  ...prettierConfig,
  plugins: [...prettierConfig.plugins, "prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./website/src/root.css",
};

export default config;
