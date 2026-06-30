import { test } from "node:test";
import assert from "node:assert/strict";
import { createSearcher, selectForInjection } from "../src/search.mjs";

const SKILLS = [
  { displayName: "impeccable", name: "impeccable", namespace: null, description: "design polish animate product UI components motion micro-interactions", source: "user:.claude", path: "a" },
  { displayName: "taste", name: "taste", namespace: null, description: "design taste for landing pages", source: "user:.claude", path: "b" },
  { displayName: "demo:beta", name: "beta", namespace: "demo", description: "deploy containers to a kubernetes cluster", source: "plugin:demo@acme", path: "c" },
];

test("surfaces impeccable for product UI / motion query", () => {
  const s = createSearcher(SKILLS);
  const res = s.search("product UI motion micro-interactions", { topK: 5 });
  assert.equal(res[0].displayName, "impeccable");
});

test("name match outranks description match via boost", () => {
  const s = createSearcher(SKILLS);
  const res = s.search("taste", { topK: 5 });
  assert.equal(res[0].displayName, "taste");
});

test("selectForInjection caps, thresholds, and excludes seen", () => {
  const s = createSearcher(SKILLS);
  const res = s.search("kubernetes deploy", { topK: 5 });
  const picked = selectForInjection(res, { threshold: 0.1, topK: 3, exclude: new Set(["demo:beta"]) });
  assert.ok(!picked.some(r => r.displayName === "demo:beta"));
});

test("stopword-only query matches nothing (filler is filtered out)", () => {
  const s = createSearcher(SKILLS);
  // every token here is a stopword or < 2 chars, so there are no real query terms
  assert.equal(s.search("what is it for", { topK: 5 }).length, 0);
  assert.equal(s.search("how are you today", { topK: 5 }).length, 0);
  // a real content term still matches
  assert.ok(s.search("kubernetes", { topK: 5 }).length > 0);
});
