import prettierConfig from "@resolid/config/prettier";

/**
 * @type {import("prettier").Config}
 */
const config = {
  ...prettierConfig,
  plugins: [...prettierConfig.plugins],
};

export default config;
