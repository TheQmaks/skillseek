import { test } from "node:test";
import assert from "node:assert/strict";
import { findDuplicateClusters, formatDupesReport } from "../src/dupes.mjs";

const SKILLS = [
  { displayName: "taste", name: "taste", description: "design polish typography spacing for landing pages", path: "a" },
  { displayName: "impeccable", name: "impeccable", description: "design polish typography spacing for landing pages websites", path: "b" },
  { displayName: "deploy", name: "deploy", description: "ship containers to a kubernetes cluster in production", path: "c" },
];

test("clusters near-duplicate skills, leaves distinct ones out", () => {
  const clusters = findDuplicateClusters(SKILLS, { threshold: 0.5, minTokens: 3 });
  assert.equal(clusters.length, 1);
  assert.deepEqual([...clusters[0]].sort(), ["impeccable", "taste"]);
});

test("no clusters when nothing is similar", () => {
  const clusters = findDuplicateClusters([
    { displayName: "a", name: "a", description: "kubernetes container orchestration deploy", path: "a" },
    { displayName: "b", name: "b", description: "typography spacing colour visual hierarchy", path: "b" },
  ], { threshold: 0.6 });
  assert.equal(clusters.length, 0);
});

test("formatDupesReport renders clusters", () => {
  const out = formatDupesReport(SKILLS, { threshold: 0.5 });
  assert.match(out, /skillseek dupes/);
  assert.match(out, /taste|impeccable/);
});
