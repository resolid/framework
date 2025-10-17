export type NodeVersions = {
  node: 20 | 22 | 24;
  vercel: 20 | 22;
  netlify: 20 | 22;
};

export type Platform =
  | {
      platform: "node";
      nodeVersion?: NodeVersions["node"];
    }
  | {
      platform: "vercel";
      nodeVersion?: NodeVersions["vercel"];
    }
  | {
      platform: "netlify";
      nodeVersion?: NodeVersions["netlify"];
    };
