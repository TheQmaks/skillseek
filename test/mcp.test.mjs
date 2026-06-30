import { test } from "node:test";
import assert from "node:assert/strict";
import { handleSkillSearch, createServer } from "../src/mcp-server.mjs";
import { createSearcher } from "../src/search.mjs";

const searcher = createSearcher([
  { displayName: "demo:beta", name: "beta", namespace: "demo", description: "deploy containers to kubernetes", source: "plugin:demo@acme", path: "c" },
]);

test("handleSkillSearch returns text content with matches", () => {
  const r = handleSkillSearch({ query: "kubernetes deploy", top_k: 5 }, searcher);
  assert.equal(r.content[0].type, "text");
  assert.match(r.content[0].text, /demo:beta/);
});

test("handleSkillSearch handles no matches gracefully", () => {
  const r = handleSkillSearch({ query: "zzzznotarealthing", top_k: 5 }, searcher);
  assert.match(r.content[0].text, /No matching skills/i);
});

test("createServer returns a truthy server object without throwing", () => {
  const server = createServer(searcher);
  assert.ok(server, "createServer must return a truthy McpServer instance");
});
