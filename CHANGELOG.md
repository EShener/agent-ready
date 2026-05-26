# Changelog

## Unreleased

- Added stronger Next.js and Astro detection from config files, router conventions, and `.astro` files.
- Added fixture coverage for Next.js App Router and Astro projects.
- Added Docker and Docker Compose detection, including generated `AGENTS.md` local service guidance.
- Added real-world readiness snapshots to the examples gallery.
- Added weekly growth metrics tracking with collection commands and a baseline launch log.
- Added SvelteKit and Nuxt detection from framework configs, route conventions, and `.svelte`/`.vue` files.
- Added Rails and Laravel detection with Bundler and Composer command inference.
- Expanded real-world readiness snapshots with SvelteKit, Nuxt, Rails, and Laravel examples.
- Added Spring Boot detection with Maven and Gradle wrapper command inference.
- Added a detector coverage table grouped by ecosystem.
- Added Ruby and PHP package manager edge-case coverage for hybrid and non-framework projects.
- Added .NET and C# detection with `dotnet` command inference.
- Added Go Gin and Rust workspace web framework edge-case fixtures.

## 0.1.25

- Added a distribution checklist to the growth playbook for repeatable release promotion.
- Refreshed generated workflow examples for the latest release tag.

## 0.1.24

- Added npm badges and a growth playbook to make the project easier to evaluate and share.
- Updated launch messaging now that the scoped npm package is published.
- Added clearer guardrails for non-spammy, project-focused outreach.

## 0.1.23

- Switched the npm package name to `@eshen_fox_mie/agent-ready` after the unscoped `agent-ready` name was rejected by npm name similarity rules.
- Updated npm quick-start commands to use the scoped package while keeping the CLI binary name as `agent-ready`.
- Updated generated npx workflows to install the scoped npm package.

## 0.1.22

- Added `--preset oss|team|enterprise` for `init`, `fix`, and `improve`.
- Added preset-aware CI generation so team and enterprise presets can create pull request comment workflows.
- Updated README, showcase, and launch kit copy around the shorter preset quick start.

## 0.1.21

- Added `agent-ready examples` for a terminal-friendly example gallery.
- Added `docs/examples/` with copy-ready output samples for improvement, issue checklist, snapshot, and roadmap workflows.

## 0.1.20

- Added `agent-ready snapshot` to generate a complete static `AGENT_READINESS.md` report.
- Added `docs/launch-kit.md` with copy-ready launch, community, and outreach material.

## 0.1.19

- Added `agent-ready roadmap` to turn multi-repository readiness gaps into a phased cleanup plan.
- Added affected repository lists to common finding aggregation for team planning.

## 0.1.18

- Added `agent-ready leaderboard` for share-ready multi-repository readiness rankings.
- Added common readiness gap aggregation so teams can see repeated issues across repositories.

## 0.1.17

- Added `agent-ready improve --format issue` to turn readiness improvements into a GitHub-ready task checklist.
- Updated launch and showcase examples so maintainers can copy a contributor-friendly issue body directly from the CLI.

## 0.1.16

- Added `agent-ready improve` for a closed-loop readiness upgrade workflow: scan, apply staged fixes, rescan, and report before/after score.
- Added Markdown and JSON improvement reports with planned/applied files, CI workflow status, and remaining findings.

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
