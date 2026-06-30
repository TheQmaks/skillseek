import { STOPWORDS } from "./search.mjs";

// Tokenize a skill into a content-word set (lowercased, stopwords + short tokens dropped).
function tokenize(skill) {
  const words = `${skill.name || ""} ${skill.description || ""}`.toLowerCase().match(/[a-z0-9]+/g) || [];
  return new Set(words.filter(w => w.length > 2 && !STOPWORDS.has(w)));
}

function jaccard(a, b) {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

// Cluster near-duplicate skills by token-set Jaccard similarity. Uses an inverted index to only
// compare skills that share tokens, then union-find to merge transitively-similar skills.
export function findDuplicateClusters(skills, { threshold = 0.6, minTokens = 3 } = {}) {
  const items = skills.map(s => ({ s, t: tokenize(s) })).filter(x => x.t.size >= minTokens);
  const inv = new Map();
  items.forEach((x, i) => { for (const tk of x.t) { (inv.get(tk) || inv.set(tk, []).get(tk)).push(i); } });

  const parent = items.map((_, i) => i);
  const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const union = (a, b) => { parent[find(a)] = find(b); };

  items.forEach((x, i) => {
    const cand = new Set();
    for (const tk of x.t) for (const j of inv.get(tk)) if (j > i) cand.add(j);
    for (const j of cand) if (jaccard(x.t, items[j].t) >= threshold) union(i, j);
  });

  const groups = new Map();
  items.forEach((x, i) => { const r = find(i); (groups.get(r) || groups.set(r, []).get(r)).push(x.s.displayName); });
  return [...groups.values()].filter(g => g.length > 1).sort((a, b) => b.length - a.length);
}

export function formatDupesReport(skills, opts = {}) {
  const clusters = findDuplicateClusters(skills, opts);
  const dupeCount = clusters.reduce((n, g) => n + g.length, 0);
  const out = [];
  out.push("skillseek dupes");
  out.push("=================");
  if (!clusters.length) { out.push("No near-duplicate skill clusters found."); return out.join("\n"); }
  out.push(`${clusters.length} clusters of near-duplicate skills (${dupeCount} skills). Pruning redundant ones`);
  out.push(`reclaims skill-listing budget (see \`skillseek doctor\`).`);
  out.push("");
  for (const g of clusters.slice(0, 30)) out.push(`- ${g.join("  ==  ")}`);
  if (clusters.length > 30) out.push(`… and ${clusters.length - 30} more clusters.`);
  return out.join("\n");
}
