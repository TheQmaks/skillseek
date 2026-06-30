import { build } from "esbuild";

const entryPoints = [
  { in: "bin/cli.mjs", out: "cli" },
  { in: "src/mcp-server.mjs", out: "mcp-server" },
  { in: "hooks/session-start.mjs", out: "session-start" },
  { in: "hooks/prompt-inject.mjs", out: "prompt-inject" },
];

await build({
  entryPoints,
  outdir: "dist",
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  banner: { js: "// Bundled by esbuild — do not edit. Run `npm run build` to regenerate." },
});
console.log(`built ${entryPoints.length} entrypoints -> dist/`);
