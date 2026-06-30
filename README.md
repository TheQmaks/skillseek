# SkillSeek

**Find and surface the right Claude Code skill — automatically.**
Indexes **every skill** across all your installed plugins, searched instantly at every prompt.

_(demo GIF coming soon)_

---

## The problem

Claude Code ships with 1700+ skills — but your agent sees only a fraction of them.

Two limits cut most skills out of view:

- **`skillListingBudgetFraction`** caps the skill listing at roughly 1% of the context window. On a 200k-token model that is ~2000 tokens — enough for maybe 60–80 skills, not 1700+.
- **Description truncation**: least-recently-used skills get their descriptions dropped entirely. The agent sees the name but not what the skill does.

Result: skills like `impeccable`, `stop-slop`, `deep-research`, and hundreds of plugin-bundled skills are invisible to the agent unless it happens to know the exact name.

SkillSeek fixes this by building a complete local index and routing skill lookups through BM25 search — so the agent finds `impeccable` when it needs copy polish, not just when someone types `/impeccable`.

---

## What SkillSeek does

One index. Three surfaces.

```
~/.claude/skills/
~/.agents/skills/          ──► buildIndex() ──► SKILLS-INDEX.json
installed_plugins.json /                              │
  plugin caches                                       │
                                         ┌────────────┴────────────┐
                                         │                         │
                                   MCP tool                    CLI
                                skill_search            skillseek search
                                (agent calls it)        (you call it)
                                         │
                                    hooks (auto)
                                SessionStart + UserPromptSubmit
                                inject top matches into context
```

- **Index** — scans `~/.claude/skills`, `~/.agents/skills`, and plugin caches discovered via `installed_plugins.json`. Deduplicates, namespaces plugin skills, parses YAML frontmatter.
- **BM25 search** — MiniSearch with name-boosted scoring. Finds `impeccable` for "polish prose", `stop-slop` for "remove filler", `deep-research` for "thorough web research".
- **MCP tool** — `skill_search(query, top_k?)` — the agent calls this when it needs to find a skill. Returns a text list of matching skills with name, description, and source.
- **CLI** — `skillseek search "<task>"` for humans. `skillseek index [--if-changed]` to refresh.
- **Hooks** — `SessionStart` prints a rotating generic nudge to use skill_search and fire-and-forget refreshes the index if stale; `UserPromptSubmit` runs BM25 on the actual prompt and injects up to 3 matching skill pointers into the system prompt (no injection when no match clears the pollution-guard threshold).

---

## Install

> **On npm as [`skillseek`](https://www.npmjs.com/package/skillseek).** The index is built locally from **your** installed skills on first run; nothing is bundled, so your skill inventory never leaves your machine.

### Option A — Claude Code plugin (recommended)

```bash
# Clone + install deps (needed so hooks and the MCP server have their Node deps at runtime)
git clone https://github.com/TheQmaks/skillseek
cd skillseek && npm install

# Register as a plugin marketplace, then install
/plugin marketplace add https://github.com/TheQmaks/skillseek
/plugin install skillseek
```

The plugin wires up the MCP `skill_search` server and both hooks via `.mcp.json` and `hooks/hooks.json`. The SessionStart hook builds the index on first run and refreshes it when it goes stale.

### Option B — standalone CLI + MCP (any project)

```bash
git clone https://github.com/TheQmaks/skillseek
cd skillseek && npm install

node bin/cli.mjs index                                   # build the index for your machine
claude mcp add skillseek node "$PWD/src/mcp-server.mjs" # expose skill_search to the agent
```

---

## Usage

```bash
# Search for a skill
skillseek search "product copy review"
# | skill | description |
# | --- | --- |
# | `impeccable` | Polish prose and remove filler words |
# | `stop-slop` | Ruthless filler-word removal |
# | `copy-editing` | Line-level editing for clarity |

# Rebuild the index (full)
skillseek index

# Rebuild only if skills have changed since last index
skillseek index --if-changed

# Ask "which skill should I use for X?"
skillseek which "thorough web research"
```

**MCP tool** (called by the agent):

```
skill_search(query: string, top_k?: number) → text listing matching skills (name, description, source)
```

**Hooks** — no configuration needed after install. Control injection verbosity:

| `SKILLSEEK_INJECT` | Behavior |
|---|---|
| `off` | No per-prompt injection |
| `minimal` | Inject only the single strongest match (very high threshold) |
| `medium` (default) | Inject up to 3 **strong** matches; nothing on weak/irrelevant prompts |

Injection is deliberately high-precision: the per-prompt hook stays silent unless a match
clears a conservative BM25 threshold (filler words are filtered out first), so it never pollutes
context on chatty or off-topic prompts. Borderline relevance is left to the `skill_search` tool.

---

## Config

| Env var | Default | Description |
|---|---|---|
| `SKILLSEEK_INJECT` | `medium` | Hook injection level: `off`, `minimal`, `medium` |
| `SKILLSEEK_THRESHOLD` | preset default | Override the BM25 score floor for injection (tune for your corpus size) |
| `SKILLSEEK_INDEX` | `~/.claude/SKILLS-INDEX.json` | Override index file path |

---

## How it works

```
Every prompt                    Agent tool call             CLI / human
      │                               │                          │
      ▼                               ▼                          ▼
UserPromptSubmit hook          MCP skill_search          skillseek search
      │                               │                          │
      └──────────────────────────────►│◄─────────────────────────┘
                                      ▼
                              loadIndex(SKILLS-INDEX.json)
                                      │
                              BM25 search (MiniSearch)
                              name boost × 2, top-k results
                                      │
                              ┌───────┴───────────────┐
                              │                       │
                        inject into            return to caller
                        system prompt          (tool / CLI output)
                        (seen-skill filter,
                         pollution guard)
```

The index is built once and loaded from disk on each search call. On a warm file-system cache, search latency is under 10 ms for 1684 skills.

---

## License

MIT
