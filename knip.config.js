export default {
  workspaces: {
    website: {
      entry: ["src/server.ts", "src/entry.{client,server}.tsx", "src/portals/**/*.tsx"],
      project: "src/**/*.{ts,tsx,css}",
    },
  },

  ignoreBinaries: ["only-allow"],

  ignoreDependencies: ["@tailwindcss/language-server", "babel-plugin-react-compiler"],

  compilers: {
    css: (text) =>
      [...text.matchAll(/(?<=@)(import|plugin)[^;]+/g)].join("\n").replace("plugin", "import"),
  },
};
