import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFrontmatter } from "../src/lib.mjs";
import { buildIndex } from "../src/indexer.mjs";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import url from "node:url";

const FIX = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "fixtures");

test("parses folded multi-line description", () => {
  const md = `---\nname: my-skill\ndescription: Do a thing\n  across two lines.\ntags:\n- x\n---\n# body`;
  const fm = parseFrontmatter(md);
  assert.equal(fm.name, "my-skill");
  assert.equal(fm.description, "Do a thing across two lines.");
});

test("returns empty for no frontmatter", () => {
  assert.deepEqual(parseFrontmatter("# just a heading"), {});
});

test("buildIndex aggregates user roots + plugins, dedupes, namespaces", () => {
  // Copy the claude fixtures tree to a temp dir so we never mutate the tracked file.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "skillseek-test-"));
  try {
    fs.cpSync(path.join(FIX, "claude"), path.join(tmp, "claude"), { recursive: true });
    const ipFile = path.join(tmp, "claude", "plugins", "installed_plugins.json");
    const raw = fs.readFileSync(ipFile, "utf8").replace(
      "FIXTURE_DIR",
      path.join(tmp, "claude", "plugins").replace(/\\/g, "\\\\"),
    );
    fs.writeFileSync(ipFile, raw);

    const r = buildIndex({
      claudeDir: path.join(tmp, "claude"),
      agentsSkillsDir: path.join(FIX, "agents/skills"),
      extraUserRoots: [], // keep the test hermetic (no real ~/.codex, ~/.gemini)
    });
    const names = r.skills.map(s => s.displayName).sort();
    assert.ok(names.includes("alpha-skill"));
    assert.ok(names.includes("demo:beta"));
    assert.equal(names.filter(n => n === "dup-skill").length, 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
