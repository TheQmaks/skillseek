import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateBudget, findBrokenPaths, formatDoctorReport } from "../src/doctor.mjs";

test("estimateBudget flags dropped descriptions when the listing exceeds the budget", () => {
  const skills = Array.from({ length: 100 }, (_, i) => ({
    displayName: `skill-${i}`,
    description: "a fairly long description that consumes some tokens ".repeat(3),
    path: "x",
  }));
  const b = estimateBudget(skills, { contextTokens: 1000, budgetFraction: 0.1, charsPerToken: 4 }); // ~100 token budget
  assert.equal(b.total, 100);
  assert.equal(b.fits, false);
  assert.ok(b.estDropped > 0);
  assert.ok(b.skillsThatFit < 100);
});

test("estimateBudget: everything fits in a generous budget", () => {
  const b = estimateBudget([{ displayName: "a", description: "short", path: "x" }], { contextTokens: 200000, budgetFraction: 0.01 });
  assert.equal(b.estDropped, 0);
  assert.equal(b.fits, true);
});

test("findBrokenPaths flags non-existent SKILL.md paths", () => {
  assert.deepEqual(findBrokenPaths([{ displayName: "ghost", path: "/no/such/file/SKILL.md" }]), ["ghost"]);
});

test("formatDoctorReport renders a readable report", () => {
  const out = formatDoctorReport([{ displayName: "x", description: "y", path: "x" }], { contextTokens: 200000, budgetFraction: 0.01 });
  assert.match(out, /skillseek doctor/);
  assert.match(out, /Indexed skills:\s+1/);
});
