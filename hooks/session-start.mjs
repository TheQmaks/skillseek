#!/usr/bin/env node
// SessionStart hook: refresh a stale index (fire-and-forget) + inject a rotating imperative nudge.
// stdout is injected into the model's context. Fail silent.
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

try {
  const here = path.dirname(url.fileURLToPath(import.meta.url));
  // Resolve CLI: sibling cli.mjs (bundle layout) or ../bin/cli.mjs (source layout).
  const candidates = [path.join(here, "cli.mjs"), path.join(here, "..", "bin", "cli.mjs")];
  const cli = candidates.find(p => fs.existsSync(p)) || candidates[candidates.length - 1];
  // Rebuild the index only if installed_plugins.json is newer (cheap, non-blocking).
  execFile(process.execPath, [cli, "index", "--if-changed", "--quiet"], () => {});

  // Anti-habituation: rotate the surface so the model doesn't tune out identical text.
  const VARIANTS = [
    "Before planning or writing code, call the skill_search tool to check for a relevant installed skill.",
    "Most of your installed skills are NOT described in your context. Search them with skill_search before deciding none applies.",
    "A relevant skill probably already exists. Run skill_search with the user's intent before producing artifacts.",
  ];
  const pick = VARIANTS[Math.floor(Date.now() / 60000) % VARIANTS.length];
  process.stdout.write(`[skillseek] You have many installed skills; most are hidden from your context. ${pick} Even a ~1% chance a skill applies means search first.\n`);
} catch {
  // never break the session
}
