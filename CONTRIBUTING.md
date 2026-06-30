# Contributing to SkillSeek

Thanks for your interest! SkillSeek is a small, dependency-light Node (ESM) project — easy to hack on.

## Dev setup

```bash
git clone https://github.com/TheQmaks/skillseek
cd skillseek
npm install
npm test          # node:test, no extra test runner
```

All tests must pass on Node 18/20/22 across Windows/macOS/Linux (CI enforces this).

## Architecture (one index, three surfaces)

```
~/.claude/skills, ~/.agents/skills, plugin caches (installed_plugins.json)
      → src/indexer.mjs  → SKILLS-INDEX.json
                              │
        ┌─────────────────────┼─────────────────────┐
   MCP tool                  CLI                    hooks
 src/mcp-server.mjs       bin/cli.mjs        hooks/*.mjs (inject)
        └──────── all use src/search.mjs (BM25 + stopwords) ───────┘
```

- `src/lib.mjs` — paths + frontmatter parser
- `src/indexer.mjs` — crawl sources → records `{displayName, name, namespace, description, source, path}`
- `src/search.mjs` — MiniSearch BM25 + `selectForInjection`
- `src/inject.mjs` — pollution-safe injection policy (presets/thresholds)
- `bin/cli.mjs`, `src/mcp-server.mjs`, `hooks/` — the three surfaces

## Ground rules

- **No native modules** — every dependency must be pure JS/WASM (Windows-first, no node-gyp).
- **Keep it small** — minimal deps, no speculative abstractions.
- **TDD** — add a `node:test` test for behavior changes; tests assert real behavior, not mocks.
- Match the existing style; keep diffs surgical.

## Pull requests

1. Branch, make your change with a test, run `npm test`.
2. Keep the commit history clean and messages descriptive.
3. Open a PR describing what and why. CI must be green.

Good first issues: `skillseek doctor` validators, cross-CLI export adapters, search-quality tuning.
