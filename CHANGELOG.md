# Changelog

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
