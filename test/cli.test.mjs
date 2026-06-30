import { test } from "node:test";
import assert from "node:assert/strict";
import { formatResults, isStale, runCli } from "../bin/cli.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

test("formatResults renders a markdown table of matches", () => {
  const out = formatResults([{ displayName: "impeccable", description: "design product UI", score: 5 }]);
  assert.match(out, /impeccable/);
  assert.match(out, /design product UI/);
});

test("formatResults handles no matches", () => {
  assert.match(formatResults([]), /No matching skills/);
});

test("isStale: missing index stale; index newer fresh; plugins newer stale", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ss-cli-"));
  const idx = path.join(dir, "SKILLS-INDEX.json");
  const ip = path.join(dir, "installed_plugins.json");
  try {
    assert.equal(isStale(idx, ip), true);           // index missing
    fs.writeFileSync(ip, "{}");
    fs.writeFileSync(idx, "{}");                     // index written after plugins
    assert.equal(isStale(idx, ip), false);          // fresh
    const later = Date.now() / 1000 + 10;
    fs.utimesSync(ip, later, later);                // plugins now newer
    assert.equal(isStale(idx, ip), true);           // stale
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("runCli search returns a table for a temp index", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ss-cli2-"));
  const idx = path.join(dir, "SKILLS-INDEX.json");
  try {
    fs.writeFileSync(idx, JSON.stringify({ counts: {}, skills: [
      { displayName: "demo:beta", name: "beta", namespace: "demo", description: "deploy containers to kubernetes", source: "plugin:demo@acme", path: "c" },
    ] }));
    const { code, out } = runCli(["search", "--index", idx, "kubernetes"]);
    assert.equal(code, 0);
    assert.match(out, /demo:beta/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
