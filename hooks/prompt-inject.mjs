#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadIndex, defaultReadIndexPath } from "../src/lib.mjs";
import { buildInjection } from "../src/inject.mjs";

function readStdin() { try { return fs.readFileSync(0, "utf8"); } catch { return ""; } }
function stateFile(sessionId) {
  const dir = path.join(os.homedir(), ".claude", ".skillseek-state");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${(sessionId || "default").replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);
}

try {
  const input = JSON.parse(readStdin() || "{}");
  const prompt = input.prompt || input.prompt_text || "";
  const sessionId = input.session_id || input.sessionId;
  if (!prompt.trim()) process.exit(0);

  const sf = stateFile(sessionId);
  let seen = new Set();
  try { seen = new Set(JSON.parse(fs.readFileSync(sf, "utf8"))); } catch {}

  const { skills } = loadIndex(process.env.SKILLSEEK_INDEX || defaultReadIndexPath());
  const preset = process.env.SKILLSEEK_INJECT || "medium";
  const threshold = process.env.SKILLSEEK_THRESHOLD ? Number(process.env.SKILLSEEK_THRESHOLD) : undefined;
  const { text, picked } = buildInjection({ prompt, skills, seen, preset, threshold });

  if (text) {
    process.stdout.write(text + "\n");
    for (const p of picked) seen.add(p.displayName);
    fs.writeFileSync(sf, JSON.stringify([...seen]));
  }
} catch {
  // never break the user's turn — fail silent
}
process.exit(0);
