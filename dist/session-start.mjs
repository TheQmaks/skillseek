#!/usr/bin/env node
// Bundled by esbuild — do not edit. Run `npm run build` to regenerate.

// hooks/session-start.mjs
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
try {
  const here = path.dirname(url.fileURLToPath(import.meta.url));
  const candidates = [path.join(here, "cli.mjs"), path.join(here, "..", "bin", "cli.mjs")];
  const cli = candidates.find((p) => fs.existsSync(p)) || candidates[candidates.length - 1];
  execFile(process.execPath, [cli, "index", "--if-changed", "--quiet"], () => {
  });
  const VARIANTS = [
    "Before planning or writing code, call the skill_search tool to check for a relevant installed skill.",
    "Most of your installed skills are NOT described in your context. Search them with skill_search before deciding none applies.",
    "A relevant skill probably already exists. Run skill_search with the user's intent before producing artifacts."
  ];
  const pick = VARIANTS[Math.floor(Date.now() / 6e4) % VARIANTS.length];
  process.stdout.write(`[skillseek] You have many installed skills; most are hidden from your context. ${pick} Even a ~1% chance a skill applies means search first.
`);
} catch {
}
