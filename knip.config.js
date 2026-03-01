export default {
  workspaces: {
    website: {
      entry: ["src/server.ts", "src/entry.{client,server}.tsx", "src/portals/**/*.tsx"],
      project: "src/**/*.{ts,tsx,css}",
    },
    "packages/*": {
      ignore: ["oxlint.config.ts"],
    },
    "packages/dev": {
      ignore: ["oxlint.config.ts"],
    },
  },

  ignoreBinaries: ["only-allow"],

  ignoreDependencies: [
    "@changesets/cli",
    "@tailwindcss/language-server",
    "babel-plugin-react-compiler",
  ],

  compilers: {
    css: (text) =>
      [...text.matchAll(/(?<=@)(import|plugin)[^;]+/g)].join("\n").replace("plugin", "import"),
  },
};
