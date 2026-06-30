#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { buildIndex, writeIndex } from "../src/indexer.mjs";
import { loadIndex, defaultIndexPath, defaultReadIndexPath } from "../src/lib.mjs";
import { createSearcher } from "../src/search.mjs";
import { formatDoctorReport } from "../src/doctor.mjs";
import { formatDupesReport } from "../src/dupes.mjs";

export function formatResults(results) {
  if (!results.length) return "No matching skills.";
  const lines = ["| skill | description |", "| --- | --- |"];
  for (const r of results) lines.push(`| \`${r.displayName}\` | ${r.description || "(no description)"} |`);
  return lines.join("\n");
}

// Stale if the index file is missing, or installed_plugins.json is newer than it.
export function isStale(indexFile, installedPluginsFile = path.join(os.homedir(), ".claude", "plugins", "installed_plugins.json")) {
  let idxM; try { idxM = fs.statSync(indexFile).mtimeMs; } catch { return true; }
  let ipM; try { ipM = fs.statSync(installedPluginsFile).mtimeMs; } catch { return false; }
  return ipM > idxM;
}

function doSearch(query, indexFile) {
  let skills;
  try {
    ({ skills } = loadIndex(indexFile));
  } catch {
    return "No skills index found. Run `skillseek index` first.";
  }
  const res = createSearcher(skills).search(query, { topK: 5 });
  return formatResults(res);
}

export function runCli(argv) {
  const [cmd, ...rest] = argv;
  if (cmd === "index") {
    const quiet = rest.includes("--quiet");
    const outDir = rest.includes("--out") ? path.resolve(rest[rest.indexOf("--out") + 1]) : path.join(os.homedir(), ".claude");
    const indexFile = path.join(outDir, "SKILLS-INDEX.json");
    if (rest.includes("--if-changed") && !isStale(indexFile)) {
      return { code: 0, out: quiet ? "" : "index up to date" };
    }
    const r = buildIndex();
    const { jsonPath } = writeIndex(outDir, r);
    return { code: 0, out: quiet ? "" : `indexed ${r.counts.total} skills → ${jsonPath}` };
  }
  if (cmd === "search" || cmd === "which") {
    const rest2 = [...rest];
    const idxFlag = rest2.indexOf("--index");
    let indexFile = defaultReadIndexPath();
    if (idxFlag >= 0) { indexFile = rest2[idxFlag + 1]; rest2.splice(idxFlag, 2); }
    const query = rest2.join(" ").trim();
    return { code: 0, out: doSearch(query, indexFile) };
  }
  if (cmd === "doctor" || cmd === "dupes") {
    const idxFlag = rest.indexOf("--index");
    const indexFile = idxFlag >= 0 ? rest[idxFlag + 1] : defaultReadIndexPath();
    let skills;
    try { ({ skills } = loadIndex(indexFile)); }
    catch { return { code: 1, out: "No skills index found. Run `skillseek index` first." }; }
    return { code: 0, out: cmd === "doctor" ? formatDoctorReport(skills) : formatDupesReport(skills) };
  }
  return { code: 1, out: "usage: skillseek <index|search|which|doctor|dupes> [query] [--index <file>] [--out <dir>] [--if-changed] [--quiet]" };
}

const invoked = process.argv[1] || "";
const isMain = import.meta.url === `file://${invoked}` || import.meta.url.endsWith("/" + path.basename(invoked).replace(/\\/g, "/"));
if (isMain) {
  const { code, out } = runCli(process.argv.slice(2));
  if (out) process.stdout.write(out + "\n");
  process.exit(code);
}
