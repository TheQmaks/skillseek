import { test } from "node:test";
import assert from "node:assert/strict";
import { buildInjection, PRESETS, scaleThreshold } from "../src/inject.mjs";

const SKILLS = [
  { displayName: "demo:beta", name: "beta", namespace: "demo", description: "deploy containers to a kubernetes cluster", source: "plugin:demo@acme", path: "c" },
  { displayName: "taste", name: "taste", namespace: null, description: "design taste for landing pages", source: "user:.claude", path: "b" },
];

// These tests use an explicit low `threshold` so they verify the injection LOGIC
// (match / filter / dedup) at the tiny fixture's score scale, independent of the
// production preset thresholds (which are calibrated for a ~1700-skill corpus).

test("injects pointers for a strong match", () => {
  const { text, picked } = buildInjection({ prompt: "help me deploy to kubernetes", skills: SKILLS, threshold: 1 });
  assert.ok(picked.some(p => p.displayName === "demo:beta"));
  assert.match(text, /demo:beta/);
});

test("injects nothing for an irrelevant prompt (0 pollution)", () => {
  // With stopword filtering, none of "what"/"is"/"it" are terms and "time" is not in the fixture.
  const { text, picked } = buildInjection({ prompt: "what time is it", skills: SKILLS, threshold: 1 });
  assert.equal(picked.length, 0);
  assert.equal(text, "");
});

test("does not re-inject an already-seen skill", () => {
  const { picked } = buildInjection({ prompt: "deploy to kubernetes", skills: SKILLS, seen: new Set(["demo:beta"]), threshold: 1 });
  assert.ok(!picked.some(p => p.displayName === "demo:beta"));
});

test("preset off injects nothing", () => {
  const { text, picked } = buildInjection({ prompt: "deploy to kubernetes", skills: SKILLS, preset: "off", threshold: 1 });
  assert.equal(picked.length, 0);
  assert.equal(text, "");
});

test("default medium preset threshold is conservative (high-precision)", () => {
  // Guards against regressing to a fixture-scale threshold that over-injects on the real corpus.
  assert.ok(PRESETS.medium.threshold >= 50, `medium threshold too low: ${PRESETS.medium.threshold}`);
  assert.ok(PRESETS.minimal.threshold >= PRESETS.medium.threshold);
});

test("scaleThreshold adapts the floor to the skill-library size", () => {
  assert.equal(scaleThreshold(100, 1700), 100);   // reference corpus → base
  assert.equal(scaleThreshold(100, 5000), 100);   // larger → capped at base
  assert.ok(scaleThreshold(100, 340) < 50);       // ~1/5 the corpus → much lower floor
  assert.ok(scaleThreshold(100, 1) >= 10);        // never collapses to 0
});
