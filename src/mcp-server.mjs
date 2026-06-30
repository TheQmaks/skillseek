import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadIndex, defaultReadIndexPath } from "./lib.mjs";
import { createSearcher } from "./search.mjs";

export function handleSkillSearch({ query, top_k = 5 }, searcher) {
  const res = searcher.search(query, { topK: top_k });
  if (!res.length) return { content: [{ type: "text", text: `No matching skills for "${query}".` }] };
  const text = res.map(r =>
    `- ${r.displayName} :: ${r.description || "(no description)"}\n  invoke: Skill("${r.displayName}")  | source: ${r.source}`
  ).join("\n");
  return { content: [{ type: "text", text: `Matching installed skills:\n${text}` }] };
}

const TOOL_DESCRIPTION =
  "Search ALL installed Claude Code skills (including plugin-bundled ones) by what they do. " +
  "Use this when a task might match an installed skill, BEFORE deciding none applies. " +
  "Returns skill names, descriptions, source, and how to invoke. " +
  "Example queries: 'deploy to vercel', 'format python', 'product UI motion'.";

export function createServer(searcher) {
  const server = new McpServer({ name: "skillseek", version: "0.2.0" });
  server.tool(
    "skill_search",
    TOOL_DESCRIPTION,
    { query: z.string(), top_k: z.number().optional() },
    (args) => handleSkillSearch(args, searcher),
  );
  return server;
}

export async function startServer(indexFile = defaultReadIndexPath()) {
  const { skills } = loadIndex(indexFile);
  const searcher = createSearcher(skills);
  const server = createServer(searcher);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const invoked = process.argv[1] || "";
const isMain =
  import.meta.url === `file://${invoked}` ||
  import.meta.url.endsWith("/" + (invoked.split(/[\\/]/).pop() || ""));
if (isMain) startServer().catch((e) => { console.error(e); process.exit(1); });
