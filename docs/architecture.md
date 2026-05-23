# Architecture

## Overview

agent-ready is a zero-dependency Node.js CLI and reusable GitHub Action for making repositories safer for AI coding agents. The core model is deterministic: scan a repository, normalize its profile, lint agent-readiness gaps, score the result, then render reports or generated files.

## Technology

- Languages: JavaScript, Python
- Frameworks/tools: Node.js test runner, GitHub Actions, npm package metadata, Python demo asset renderer
- Package manager: npm
- Monorepo: no
- CI: `.github/workflows/ci.yml`

## Repository Layout

- `bin/agent-ready.mjs`: executable wrapper that calls the CLI runner.
- `src/cli.mjs`: command parsing and command dispatch.
- `src/scanner.mjs`: repository detection for languages, commands, docs, CI, frameworks, and monorepo signals.
- `src/linter.mjs`: readiness findings and 0-100 scoring.
- `src/generator.mjs`: generated agent docs and team readiness artifacts.
- `src/improver.mjs`: closed-loop scan, fix, rescan, and before/after reporting.
- `src/reporter.mjs`: text, Markdown, badge, matrix, comparison, and improvement renderers.
- `src/workflow.mjs`: generated GitHub Actions workflow content and safe write behavior.
- `action.yml`: reusable GitHub Action wrapper for Step Summary, annotations, score gate, and PR comments.
- `test/`: Node test runner coverage and fixtures.
- `docs/`: showcase assets, architecture notes, and ADRs.

## Runtime Flow

1. A user runs `agent-ready <command>` locally, through `npx`, or via the GitHub Action.
2. `bin/agent-ready.mjs` calls `runCli()` in `src/cli.mjs`.
3. Scanner modules build a normalized repository profile from files, package metadata, config, and CI signals.
4. Command-specific modules lint, score, compare, generate, benchmark, or improve the repository.
5. Reporter modules render output to stdout, GitHub Step Summary, GitHub annotations, PR comments, or generated files.

## Data Flow

- Inputs: repository files, `agent-ready.json`, CLI flags, package metadata, and GitHub Action inputs.
- Processing: all scans and rules are local and deterministic; there is no telemetry and no network call in core CLI execution.
- Outputs: Markdown/text/JSON reports, generated agent instruction files, generated CI workflows, Action annotations, Step Summary, and PR comments.
- Persistence: generated files are written only by explicit write commands such as `init`, `fix`, `improve`, or `ci --write`.
- External services: GitHub is used only by the reusable Action when posting a PR comment.

## Verification

- [ ] `npm run test`
- [ ] `npm run lint`
