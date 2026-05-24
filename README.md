# agent-ready

Make any repository ready for AI coding agents in 60 seconds.

[![CI](https://github.com/EShener/agent-ready/actions/workflows/ci.yml/badge.svg)](https://github.com/EShener/agent-ready/actions/workflows/ci.yml)
![agent-ready](https://img.shields.io/badge/agent--ready-100%2F100-brightgreen)
![license](https://img.shields.io/badge/license-MIT-blue)

[Showcase](docs/showcase.md) · [Benchmark](BENCHMARK.md) · [Launch notes](LAUNCH.md)

`agent-ready` is a zero-dependency CLI that scans a codebase, generates canonical AI agent instructions, checks them for drift and missing verification steps, and gives the repository an explainable Agent Readiness Score.

It is for developers using Codex, Claude Code, Cursor, Gemini CLI, GitHub Copilot, or any coding agent that needs repository instructions before editing safely.

```bash
npx --yes github:EShener/agent-ready improve --dry-run
```

Preview exactly which files will be added and the estimated score gain before anything is written.

<p align="center">
  <img src="docs/assets/agent-ready-pr-comment.gif" alt="agent-ready posts a pull request comment with score, compatibility, and top fixes" width="820">
</p>

## Why This Exists

AI coding agents fail for boring reasons: they do not know the test command, they miss local safety rules, they read stale instructions, or every tool has its own duplicated guidance.

`agent-ready` turns that tribal knowledge into a small, lintable repository contract.

## Benchmark Snapshot

On a 2026-05-23 sample of six public AI/devtool repositories, the average Agent Readiness Score was 28/100. See [BENCHMARK.md](BENCHMARK.md) for the reproducible leaderboard and sample commits.

## 60 Second Demo

Use the GitHub Action immediately:

```yaml
- uses: EShener/agent-ready@v0.1.17
  with:
    fail-under: 80
```

Use the CLI from GitHub until the npm package is published:

```bash
npx --yes github:EShener/agent-ready doctor
npx --yes github:EShener/agent-ready explain
npx --yes github:EShener/agent-ready matrix
npx --yes github:EShener/agent-ready comment
npx --yes github:EShener/agent-ready compare --before before.json --after after.json
npx --yes github:EShener/agent-ready improve --dry-run
npx --yes github:EShener/agent-ready improve --dry-run --format issue
npx --yes github:EShener/agent-ready improve --level team
npx --yes github:EShener/agent-ready fix --dry-run
npx --yes github:EShener/agent-ready fix --level team --dry-run
npx --yes github:EShener/agent-ready init --dry-run
npx --yes github:EShener/agent-ready score --fail-under 80
npx --yes github:EShener/agent-ready ci
npx --yes github:EShener/agent-ready ci --comment
npx --yes github:EShener/agent-ready ci --write --dry-run
npx --yes github:EShener/agent-ready benchmark ../repo-a ../repo-b
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

### `fix`

Applies the safe generated fixes: agent instruction files plus the Agent Ready CI workflow. Existing files are skipped unless `--force` is provided.

Use `--level team` to add collaboration starters such as PR templates, contributing docs, architecture docs, and an ADR. Use `--level full` to also add `.env.example`, CODEOWNERS, an agent-readiness issue template, and a security policy.

```bash
agent-ready fix --dry-run
agent-ready fix
agent-ready fix --level team
agent-ready fix --level full --dry-run
agent-ready fix --targets codex,cursor --no-ci
agent-ready fix --force
```

### `improve`

Runs scan, applies staged fixes, rescans, and prints a before/after improvement report. Use `--dry-run` to turn it into a safe launch-post screenshot that shows planned files without writing them. Use `--format issue` to create a GitHub-ready checklist for contributors.

```bash
agent-ready improve --dry-run
agent-ready improve
agent-ready improve --level team
agent-ready improve --level full --comment
agent-ready improve --dry-run --format issue
agent-ready improve --format json
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

### `annotations`

Prints GitHub Actions workflow commands for readiness findings, so CI can show warnings and notices inline.

```bash
agent-ready annotations
agent-ready annotations --format json
```

### `score`

Prints a 0-100 Agent Readiness Score with explainable deductions.

```bash
agent-ready score
agent-ready score --fail-under 80
```

Use `--fail-under` in CI to fail a build when repository instructions regress.

### `explain`

Prints an impact-ranked fix plan with why each issue matters and how many points each fix can recover.

```bash
agent-ready explain
agent-ready explain --format json
```

### `matrix`

Prints a compatibility matrix for Codex, Cursor, GitHub Copilot, Claude Code, and Gemini CLI.

```bash
agent-ready matrix
agent-ready matrix --format json
```

### `comment`

Prints a concise GitHub-ready Markdown summary for PR comments, issues, discussions, and launch posts.

```bash
agent-ready comment
agent-ready comment --max-fixes 5
agent-ready comment --format json
```

### `compare`

Compares two readiness JSON files and prints a before/after score summary for PR comments, issues, and launch posts.

```bash
agent-ready report --format json > before.json
agent-ready fix
agent-ready report --format json > after.json
agent-ready compare --before before.json --after after.json
agent-ready compare --before before.json --after after.json --format json
```

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

### `benchmark`

Scores multiple local repositories and prints a shareable Markdown leaderboard.

```bash
agent-ready benchmark ../repo-a ../repo-b
agent-ready benchmark --root ../work repo-a repo-b
agent-ready benchmark --format json
```

### `ci`

Prints a ready-to-paste GitHub Actions workflow.

```bash
agent-ready ci
agent-ready ci --write
agent-ready ci --write --dry-run
agent-ready ci --write --force
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
      - uses: EShener/agent-ready@v0.1.17
        with:
          fail-under: 80
```

The action writes a diagnosis, compatibility matrix, and Markdown report to the GitHub Actions Step Summary, annotates readiness findings in the Actions UI, then fails the job when the score is below `fail-under`.

To post or update a pull request comment, grant comment permissions and set `comment: true`:

```yaml
permissions:
  contents: read
  pull-requests: write
  issues: write

steps:
  - uses: actions/checkout@v4
  - uses: EShener/agent-ready@v0.1.17
    with:
      fail-under: 80
      comment: true
```

Generate this workflow with:

```bash
npx --yes github:EShener/agent-ready ci > .github/workflows/agent-ready.yml
npx --yes github:EShener/agent-ready ci --comment
npx --yes github:EShener/agent-ready ci --comment --write
npx --yes github:EShener/agent-ready ci --write
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
