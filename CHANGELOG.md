# Changelog

## 0.1.15

- Added `agent-ready fix --level basic|team|full` for staged repository readiness improvements.
- Added generated team/full starter files for PR templates, contributing docs, architecture docs, ADRs, environment examples, CODEOWNERS, issue templates, and security policy.

## 0.1.14

- Added `docs/showcase.md` with the demo GIF, PR comment example, copy-paste workflow, benchmark evidence, and launch snippet.
- Added a README showcase link for faster project evaluation by new visitors.

## 0.1.13

- Added a README demo GIF showing the pull request comment workflow.
- Added a reproducible demo asset renderer at `scripts/render-demo-gif.py`.

## 0.1.12

- Added optional pull request comment publishing to the reusable GitHub Action.
- Added `agent-ready ci --comment` to generate workflows with the required PR comment permissions.

## 0.1.11

- Added `agent-ready comment` for GitHub-ready PR, issue, and discussion summaries.
- Added structured JSON output for comment automation and launch workflows.

## 0.1.10

- Added the agent compatibility matrix to the reusable GitHub Action Step Summary.
- Updated generated GitHub Action workflows to reference `v0.1.10`.

## 0.1.9

- Added `agent-ready matrix` for a screenshot-friendly compatibility table across Codex, Cursor, Copilot, Claude Code, and Gemini CLI.
- Added Markdown and JSON matrix output for README badges, launch posts, and CI summaries.

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
