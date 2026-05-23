# Changelog

## 0.1.8

- Added `agent-ready compare` for before/after readiness JSON comparisons.
- Added Markdown and JSON comparison output for PR comments and launch material.

## 0.1.7

- Added `agent-ready explain` for impact-ranked fix plans with estimated score recovery.
- Added Markdown and JSON explanation output.

## 0.1.6

- Added `agent-ready fix` to generate agent docs and install the CI readiness workflow in one command.
- Added `--no-ci`, `--dry-run`, `--force`, and `--targets` support for the fix workflow.

## 0.1.5

- Added `agent-ready ci --write` for writing `.github/workflows/agent-ready.yml` directly.
- Added CI workflow write safeguards with `--dry-run`, `--force`, and `--output`.

## 0.1.4

- Added `BENCHMARK.md` with a reproducible public AI/devtool repository benchmark snapshot.
- Added `benchmark:sample` and `benchmark:fixtures` scripts.

## 0.1.3

- Added `benchmark` command for scoring multiple repositories and generating a Markdown leaderboard.

## 0.1.2

- Added GitHub Actions annotations for readiness findings.

## 0.1.1

- Added `init --interactive` for guided setup.
- Added GitHub Actions Step Summary output to the reusable action.

## 0.1.0

- Added repository scanner for common JavaScript/TypeScript, Python, Rust, and Go projects.
- Added `init` generation for `AGENTS.md`, Claude, Cursor, Gemini, and Copilot instruction files.
- Added `doctor` command for a compact diagnosis and screenshot-friendly summary.
- Added `ci` command for generating a ready-to-paste GitHub Actions workflow.
- Added reusable GitHub Action support via `uses: EShener/agent-ready@main`.
- Added monorepo/workspace detection for npm workspaces, pnpm workspaces, Turborepo, Nx, Lerna, and Rush.
- Added Playwright and Storybook detection.
- Added readiness linter with actionable findings.
- Added explainable Agent Readiness Score.
- Added Markdown/JSON reports.
- Added README badge output.
- Added `agent-ready.json` configuration support.
- Added CI-friendly `--fail-under` score gate.
