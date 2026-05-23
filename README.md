# agent-ready

Make any repository ready for AI coding agents in 60 seconds.

![agent-ready](https://img.shields.io/badge/agent--ready-100%2F100-brightgreen)

`agent-ready` is a zero-dependency CLI that scans a codebase, generates canonical AI agent instructions, checks the instructions for drift and missing verification steps, and gives the repository an Agent Readiness Score.

## Quick Start

```bash
npx agent-ready scan
npx agent-ready init --targets codex,claude,cursor,gemini,copilot
npx agent-ready lint
npx agent-ready score
npx agent-ready badge
```

For local development in this repository:

```bash
node bin/agent-ready.mjs scan --root test/fixtures/node-app
node bin/agent-ready.mjs init --root test/fixtures/node-app --dry-run
npm test
```

## Commands

### `scan`

Detects languages, frameworks, package manager, CI, standard commands, existing agent docs, README, and top-level structure.

```bash
agent-ready scan --format json
```

### `init`

Generates agent instruction files:

- `AGENTS.md` for Codex and generic agents
- `CLAUDE.md`
- `.cursor/rules/agent-ready.mdc`
- `GEMINI.md`
- `.github/copilot-instructions.md`

Existing files are skipped unless `--force` is provided.

```bash
agent-ready init --targets codex,claude,cursor --dry-run
```

### `lint`

Finds missing or risky agent readiness gaps:

- Missing canonical `AGENTS.md`
- Missing test/lint commands
- Missing README or CI
- Agent instructions with no safety or verification section
- Stale path references in agent docs
- Drift-prone duplicate agent docs

```bash
agent-ready lint --format json
```

### `score`

Prints a 0-100 Agent Readiness Score with explainable deductions.

```bash
agent-ready score
agent-ready score --fail-under 80
```

Use `--fail-under` in CI to fail a build when repository instructions regress.

### `report`

Creates a Markdown or JSON report for issues, PRs, or README updates.

```bash
agent-ready report --format markdown
```

### `badge`

Prints a Shields-compatible static badge for README files.

```bash
agent-ready badge
agent-ready badge --format url
agent-ready badge --format json
agent-ready badge --fail-under 80
```

## Configuration

Add `agent-ready.json` when detected commands or docs need overrides.

```json
{
  "targets": ["codex", "claude", "cursor"],
  "docs": {
    "architecture": "docs/architecture.md",
    "decisions": "docs/adr"
  },
  "commands": {
    "install": "npm install",
    "test": "npm run test:ci",
    "lint": "npm run lint"
  }
}
```

`agent-ready init` uses configured targets when `--targets` is omitted. Use `--config path/to/file.json` to load a non-default config file.

## CI Gate

Use the score command as a lightweight quality gate:

```yaml
name: Agent Ready

on:
  pull_request:

jobs:
  agent-ready:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx agent-ready score --fail-under 80
```

## Launch Assets

See `LAUNCH.md` for repository setup, demo checklist, and copy for Show HN or social posts.

## Design Principles

- Local-first: no API key, no telemetry, no network calls.
- Canonical instructions: keep `AGENTS.md` as the source of truth.
- Agent-agnostic: generate small shim files for Claude, Cursor, Gemini, and Copilot.
- Verification-first: agents should know how to run the smallest relevant checks.
- Compact context: instructions should be short enough to fit naturally into agent context.

## Development

```bash
npm test
npm run check
```

The implementation uses only Node.js built-ins so it can run anywhere Node 20+ is available.
