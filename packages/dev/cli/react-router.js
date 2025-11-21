#!/usr/bin/env node
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { argv, exit } from "node:process";
import { fileURLToPath } from "node:url";

const binPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../node_modules/.bin/react-router",
);

const child = spawn(binPath, argv.slice(2), { stdio: "inherit" });

child.on("exit", (code) => {
  exit(code ?? 0);
});
