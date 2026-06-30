import { createSearcher, selectForInjection } from "./search.mjs";

// Thresholds are BM25 raw scores, calibrated for a large installed corpus (~1700 skills).
// They are intentionally high so the per-prompt hook only injects on STRONG matches —
// borderline relevance is left to the SessionStart nudge + the on-demand skill_search tool,
// because a single absolute BM25 threshold cannot cleanly separate weak relevance from noise.
// Override per-call with `threshold`, or via the SKILLSEEK_THRESHOLD env var in the hook.
const PRESETS = {
  off:     { topK: 0, threshold: Infinity },
  minimal: { topK: 1, threshold: 150 }, // only the single strongest match
  medium:  { topK: 3, threshold: 100 }, // up to 3 strong matches (default)
};

// BM25 raw scores scale with corpus size, so the calibrated base (tuned for ~1700 skills) is too
// high for a small library. Scale the threshold down proportionally for smaller corpora (floored so
// it never collapses to 0). An explicit `threshold` / SKILLSEEK_THRESHOLD always wins over this.
export function scaleThreshold(base, corpusSize, ref = 1700) {
  if (!corpusSize || corpusSize >= ref) return base;
  return Math.max(10, Math.round(base * (corpusSize / ref)));
}

export function buildInjection({ prompt, skills, seen = new Set(), preset = "medium", searcher = null, threshold, topK } = {}) {
  const cfg = PRESETS[preset] || PRESETS.medium;
  const effTopK = topK ?? cfg.topK;
  const corpusSize = Array.isArray(skills) ? skills.length : undefined;
  const effThreshold = threshold ?? scaleThreshold(cfg.threshold, corpusSize);
  if (effTopK === 0) return { text: "", picked: [] };
  const s = searcher || createSearcher(skills);
  const results = s.search(prompt, { topK: Math.max(8, effTopK) });
  const picked = selectForInjection(results, { threshold: effThreshold, topK: effTopK, exclude: seen });
  if (!picked.length) return { text: "", picked: [] };
  const lines = picked.map(p => `- ${p.displayName} :: ${p.description || "(no description)"}`).join("\n");
  const text =
    `[skillseek] Possibly relevant installed skills for this task (consider invoking via Skill, or call skill_search):\n${lines}`;
  return { text, picked };
}

export { PRESETS };
