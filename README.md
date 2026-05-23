# agent-ready

Make any repository ready for AI coding agents in 60 seconds.

[![CI](https://github.com/EShener/agent-ready/actions/workflows/ci.yml/badge.svg)](https://github.com/EShener/agent-ready/actions/workflows/ci.yml)
![agent-ready](https://img.shields.io/badge/agent--ready-100%2F100-brightgreen)
![license](https://img.shields.io/badge/license-MIT-blue)

`agent-ready` is a zero-dependency CLI that scans a codebase, generates canonical AI agent instructions, checks them for drift and missing verification steps, and gives the repository an explainable Agent Readiness Score.

It is for developers using Codex, Claude Code, Cursor, Gemini CLI, GitHub Copilot, or any coding agent that needs repository instructions before editing safely.

## Why This Exists

AI coding agents fail for boring reasons: they do not know the test command, they miss local safety rules, they read stale instructions, or every tool has its own duplicated guidance.

`agent-ready` turns that tribal knowledge into a small, lintable repository contract.

## 60 Second Demo

Use the GitHub Action immediately:

```yaml
- uses: EShener/agent-ready@v0.1.1
  with:
    fail-under: 80
```

Use the CLI from GitHub until the npm package is published:

```bash
npx --yes github:EShener/agent-ready doctor
npx --yes github:EShener/agent-ready init --dry-run
npx --yes github:EShener/agent-ready score --fail-under 80
npx --yes github:EShener/agent-ready ci
```

Example output:

```text
agent-ready doctor: my-app
Score: 72/100 (C)
Primary language: TypeScript
Commands: install=npm install; test=npm run test
Agent docs: none

Top fixes:
- [warning] Missing AGENTS.md canonical agent instructions.
  Run `agent-ready init --targets codex`.
```

After review, generate the files:

```bash
npx --yes github:EShener/agent-ready init --targets codex,claude,cursor,gemini,copilot
```

## What It Generates

- `AGENTS.md` as the canonical source of truth
- `CLAUDE.md`
- `.cursor/rules/agent-ready.mdc`
- `GEMINI.md`
- `.github/copilot-instructions.md`

The tool-specific files are intentionally small shims that point back to `AGENTS.md`, so instructions do not drift across tools.

## Commands

### `doctor`

Runs scan, lint, and score together. This is the best first command and the best screenshot for issues.

```bash
agent-ready doctor
agent-ready doctor --format json
agent-ready doctor --fail-under 80
```

### `scan`

Detects languages, frameworks, package manager, CI, standard commands, existing agent docs, README, and top-level structure.

```bash
agent-ready scan
agent-ready scan --format json
```

### `init`

Plans or writes agent instruction files. Existing files are skipped unless `--force` is provided.

```bash
agent-ready init --dry-run
agent-ready init --targets codex,claude,cursor
agent-ready init --interactive
agent-ready init --force
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
agent-ready lint
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

### `ci`

Prints a ready-to-paste GitHub Actions workflow.

```bash
agent-ready ci
agent-ready ci --fail-under 90
agent-ready ci --mode npx
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

Use the reusable GitHub Action as a lightweight quality gate:

```yaml
name: Agent Ready

on:
  pull_request:
  push:
    branches: [main]

jobs:
  agent-ready:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: EShener/agent-ready@v0.1.1
        with:
          fail-under: 80
```

Generate this workflow with:

```bash
npx --yes github:EShener/agent-ready ci > .github/workflows/agent-ready.yml
```

## Supported Detection

Current detectors cover common JavaScript/TypeScript, Python, Rust, Go, and monorepo repositories:

- package manager: npm, pnpm, yarn, bun, pip, cargo, go
- commands: install, dev, start, build, test, lint, format
- docs: README, architecture docs, ADR directories, existing agent docs
- CI: GitHub Actions workflows
- monorepos: npm/pnpm workspaces, Turborepo, Nx, Lerna, Rush
- frameworks/tools: React, Vite, Next.js, Vue, Astro, Svelte, Express, NestJS, Playwright, Storybook, FastAPI, Django, Flask, Pytest, Rust web frameworks, Gin

## Design Principles

- Local-first: no API key, no telemetry, no network calls.
- Canonical instructions: keep `AGENTS.md` as the source of truth.
- Agent-agnostic: generate small shim files for Claude, Cursor, Gemini, and Copilot.
- Verification-first: agents should know how to run the smallest relevant checks.
- Compact context: instructions should be short enough to fit naturally into agent context.

## Roadmap

- More framework detectors and fixture coverage
- npm package publishing
- MCP server for editor and agent integrations
- Repository badge automation
- Benchmarks on real open-source repositories

## Contributing

Good first issues:

- Add a detector for a framework you use.
- Add a fixture for a repository shape that currently scores poorly.
- Improve a lint rule with a clearer fix suggestion.
- Add support for another agent instruction target.

Run checks before opening a PR:

```bash
npm run check
npm test
node bin/agent-ready.mjs score --fail-under 90
```

See `CONTRIBUTING.md` and `LAUNCH.md` for contributor and launch notes.
