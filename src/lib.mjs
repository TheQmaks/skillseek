import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import url from "node:url";

export function stripQuotes(s) {
  if (s.length >= 2 && ((s[0] === '"' && s.at(-1) === '"') || (s[0] === "'" && s.at(-1) === "'")))
    return s.slice(1, -1);
  return s;
}

export function parseFrontmatter(text) {
  if (!text.startsWith("---")) return {};
  const lines = text.split(/\r?\n/);
  if (lines[0].trim() !== "---") return {};
  let end = -1;
  for (let i = 1; i < lines.length; i++) if (lines[i].trim() === "---") { end = i; break; }
  if (end === -1) return {};
  const fm = lines.slice(1, end);
  const out = {};
  for (let i = 0; i < fm.length; i++) {
    const m = fm[i].match(/^([A-Za-z0-9_-]+):(.*)$/);
    if (!m) continue;
    const key = m[1];
    if (key !== "name" && key !== "description") continue;
    let val = m[2].trim();
    const isBlock = ["", ">", "|", ">-", "|-", ">+", "|+"].includes(val);
    const parts = isBlock ? [] : [val];
    for (let j = i + 1; j < fm.length; j++) {
      if (/^\s+\S/.test(fm[j])) { parts.push(fm[j].trim()); i = j; } else break;
    }
    out[key] = stripQuotes(parts.join(" ").trim());
  }
  return out;
}

export function toForward(p) { return p.replace(/\\/g, "/"); }

export function defaultIndexPath() {
  return path.join(os.homedir(), ".claude", "SKILLS-INDEX.json");
}

export function defaultReadIndexPath() {
  const home = defaultIndexPath(); // ~/.claude/SKILLS-INDEX.json
  if (fs.existsSync(home)) return home;
  const pkg = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "..", "SKILLS-INDEX.json");
  if (fs.existsSync(pkg)) return pkg;
  return home;
}

export function loadIndex(file = defaultIndexPath()) {
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  return { counts: json.counts, skills: json.skills };
}
