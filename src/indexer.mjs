import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { parseFrontmatter, toForward } from "./lib.mjs";

function findSkillMd(dir, depth = 4) {
  const out = [];
  let entries; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.isFile() && e.name.toLowerCase() === "skill.md") out.push(path.join(dir, e.name));
    else if (e.isDirectory() && depth > 0) {
      if (["node_modules", ".git", "tests", "test", "fixtures"].includes(e.name)) continue;
      out.push(...findSkillMd(path.join(dir, e.name), depth - 1));
    }
  }
  return out;
}

function readSkill(file, warnings) {
  let text; try { text = fs.readFileSync(file, "utf8"); } catch { warnings.push(`unreadable: ${file}`); return null; }
  const fm = parseFrontmatter(text);
  const name = (fm.name || path.basename(path.dirname(file))).trim();
  const description = (fm.description || "").replace(/\s+/g, " ").trim();
  return { name, description };
}

// Extra user skill roots for other agent CLIs that adopted the SKILL.md standard (Codex, Gemini).
// Skipped silently if absent — harmless for Claude-only users, free coverage for multi-CLI users.
function defaultExtraUserRoots() {
  const home = os.homedir();
  return [
    ["user:.codex", path.join(home, ".codex", "skills")],
    ["user:.gemini", path.join(home, ".gemini", "skills")],
  ];
}

export function buildIndex({ claudeDir = path.join(os.homedir(), ".claude"), agentsSkillsDir = path.join(os.homedir(), ".agents", "skills"), extraUserRoots = defaultExtraUserRoots() } = {}) {
  const skills = [], warnings = [], skipped = [];
  const userSeen = new Set();
  for (const [label, root] of [["user:.claude", path.join(claudeDir, "skills")], ["user:.agents", agentsSkillsDir], ...extraUserRoots]) {
    let entries; try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const file = path.join(root, e.name, "SKILL.md");
      if (!fs.existsSync(file)) continue;
      const s = readSkill(file, warnings); if (!s) continue;
      if (userSeen.has(s.name.toLowerCase())) continue;
      userSeen.add(s.name.toLowerCase());
      skills.push({ displayName: s.name, name: s.name, namespace: null, description: s.description, source: label, path: toForward(file) });
    }
  }
  const ipPath = path.join(claudeDir, "plugins", "installed_plugins.json");
  let installed = {}; try { installed = JSON.parse(fs.readFileSync(ipPath, "utf8")); } catch (err) { warnings.push(`no installed_plugins.json: ${err.message}`); }
  for (const [pluginKey, instances] of Object.entries(installed.plugins || {})) {
    const pluginName = pluginKey.split("@")[0];
    const inst = Array.isArray(instances) ? instances[0] : instances;
    const installPath = inst && inst.installPath;
    if (!installPath) { warnings.push(`no installPath: ${pluginKey}`); continue; }
    const skillsDir = path.join(installPath, "skills");
    if (!fs.existsSync(skillsDir)) { skipped.push(pluginKey); continue; }
    for (const file of findSkillMd(skillsDir)) {
      const s = readSkill(file, warnings); if (!s) continue;
      skills.push({ displayName: `${pluginName}:${s.name}`, name: s.name, namespace: pluginName, description: s.description, source: `plugin:${pluginKey}`, path: toForward(file) });
    }
  }
  const seen = new Set(); const deduped = [];
  for (const s of skills) { const k = s.path; if (seen.has(k)) continue; seen.add(k); deduped.push(s); }
  deduped.sort((a, b) => { const ga = a.namespace || "", gb = b.namespace || ""; return ga !== gb ? (ga < gb ? -1 : 1) : a.displayName.localeCompare(b.displayName); });
  const counts = { total: deduped.length, withoutDescription: deduped.filter(s => !s.description).length, plugins: Object.keys(installed.plugins || {}).length };
  return { skills: deduped, counts, warnings, skipped };
}

export function writeIndex(outDir, result) {
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "SKILLS-INDEX.json");
  fs.writeFileSync(jsonPath, JSON.stringify({ counts: result.counts, skills: result.skills }, null, 2));
  const md = ["# SKILLS-INDEX", "", `> ${result.counts.total} skills (no description: ${result.counts.withoutDescription}).`, ""];
  let group = null;
  for (const s of result.skills) {
    const g = s.namespace ? `plugin: ${s.namespace}` : "user skills";
    if (g !== group) { md.push("", `## ${g}`, ""); group = g; }
    md.push(`- \`${s.displayName}\` :: ${s.description || "(no description)"}`);
  }
  const mdPath = path.join(outDir, "SKILLS-INDEX.md");
  fs.writeFileSync(mdPath, md.join("\n") + "\n");
  return { jsonPath: toForward(jsonPath), mdPath: toForward(mdPath) };
}
