# Security Policy

## Security posture

SkillSeek is designed to be safe by construction:

- **Read-only metadata.** It reads only skill metadata (name, description, namespace, file path) from
  `SKILL.md` frontmatter and `installed_plugins.json`. It does **not** read skill bodies into the index.
- **Executes no third-party code.** SkillSeek never runs, sources, or evaluates any installed skill's
  code or scripts. It only indexes and ranks text.
- **Offline & zero-config.** No network calls, no API keys, no remote services. BM25 search runs locally.
- **Zero telemetry.** Nothing is collected or sent anywhere.
- **Fail-silent hooks.** The hooks wrap all work in try/catch and exit 0 — a malformed input or missing
  index degrades to "no injection," never a broken session.
- **Path handling.** Per-session state filenames are sanitized; index paths are read, never executed.

The generated `SKILLS-INDEX.json` contains absolute paths to your local skill files and your installed-skill
inventory. It is **git-ignored** and never published — it stays on your machine.

## Reporting a vulnerability

Please report security issues privately via GitHub Security Advisories
("Report a vulnerability" on the repo's Security tab) rather than a public issue. We'll respond as soon as
we can and credit you in the fix unless you prefer otherwise.
