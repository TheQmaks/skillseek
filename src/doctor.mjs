import fs from "node:fs";

// Estimate how many skill descriptions Claude Code likely drops. The skill listing in the
// system prompt is budget-capped (~skillListingBudgetFraction of the context window, default
// ~1%); when installed skills' metadata overflows that budget, descriptions of the overflow
// skills are dropped (name kept only) — which is exactly the discovery gap skillseek closes.
// This is a heuristic estimate (chars/4 ≈ tokens), not Claude Code's exact internal accounting.
export function estimateBudget(skills, { contextTokens = 200000, budgetFraction = 0.01, charsPerToken = 4 } = {}) {
  const budgetTokens = Math.floor(contextTokens * budgetFraction);
  let listingChars = 0, cumTokens = 0, skillsThatFit = 0;
  for (const s of skills) {
    const line = `${s.displayName}: ${s.description || ""}`;
    const lineTokens = Math.ceil((line.length + 1) / charsPerToken);
    listingChars += line.length + 1;
    if (cumTokens + lineTokens <= budgetTokens) { cumTokens += lineTokens; skillsThatFit++; }
  }
  const listingTokens = Math.ceil(listingChars / charsPerToken);
  const estDropped = Math.max(0, skills.length - skillsThatFit);
  return { total: skills.length, listingTokens, budgetTokens, skillsThatFit, estDropped, fits: estDropped === 0 };
}

export function findBrokenPaths(skills) {
  return skills.filter(s => s.path && !fs.existsSync(s.path)).map(s => s.displayName);
}

export function bySource(skills) {
  const m = new Map();
  for (const s of skills) {
    const key = s.namespace ? `plugin:${s.namespace}` : "user";
    m.set(key, (m.get(key) || 0) + 1);
  }
  return m;
}

export function formatDoctorReport(skills, opts = {}) {
  const ctx = opts.contextTokens ?? 200000;
  const frac = opts.budgetFraction ?? 0.01;
  const b = estimateBudget(skills, opts);
  const noDesc = skills.filter(s => !s.description);
  const broken = findBrokenPaths(skills);
  const src = bySource(skills);
  const pluginCount = [...src.keys()].filter(k => k !== "user").length;

  const out = [];
  out.push("skillseek doctor");
  out.push("==================");
  out.push(`Indexed skills:  ${b.total}  (user=${src.get("user") || 0}, plugins=${pluginCount})`);
  out.push("");
  out.push("Context-budget estimate (Claude Code drops descriptions that overflow its listing budget):");
  out.push(`  Full listing needs ~${b.listingTokens.toLocaleString()} tokens`);
  out.push(`  Listing budget (~${frac * 100}% of ${ctx.toLocaleString()}) ~${b.budgetTokens.toLocaleString()} tokens → fits ~${b.skillsThatFit} skills`);
  if (b.fits) out.push(`  OK  all ${b.total} descriptions fit.`);
  else out.push(`  WARN ~${b.estDropped} skills likely have descriptions DROPPED (name-only). skillseek surfaces these on demand.`);
  out.push("");
  out.push(`Without description: ${noDesc.length}` + (noDesc.length ? `  (e.g. ${noDesc.slice(0, 5).map(s => s.displayName).join(", ")})` : ""));
  out.push(`Broken paths (SKILL.md missing): ${broken.length}` + (broken.length ? `  (e.g. ${broken.slice(0, 5).join(", ")}) → run \`skillseek index\`` : "  OK"));
  return out.join("\n");
}
