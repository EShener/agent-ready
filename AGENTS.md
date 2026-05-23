# AGENTS.md

## Project Overview
- Name: agent-ready
- Primary language: JavaScript
- Runtime: Node.js 20+ ESM
- Purpose: local-first CLI for scanning repositories, generating agent instruction files, linting them, and scoring agent readiness.

## Repository Layout
- `bin/agent-ready.mjs`: CLI executable.
- `src/scanner.mjs`: repository profiling and command detection.
- `src/generator.mjs`: `AGENTS.md` and tool-specific shim generation.
- `src/linter.mjs`: readiness rules and scoring inputs.
- `src/reporter.mjs`: text, JSON, and Markdown output rendering.
- `src/config.mjs`: optional `agent-ready.json` loading and validation.
- `test/`: Node test suite and repository fixtures.

## Commands
- install: `npm install`
- test: `npm test`
- lint: `npm run lint`
- check: `npm run check`

## Agent Workflow
- Read this file and `README.md` before editing.
- Keep the CLI zero-dependency unless there is a strong reason to add a package.
- Preserve deterministic output for tests and fixture snapshots.
- Prefer small rule additions over broad rewrites of scanner behavior.

## Safety Boundaries
- Do not modify generated dependency folders such as `node_modules`, `coverage`, `dist`, or `build`.
- Do not rewrite unrelated files or revert user changes.
- Do not add network calls, telemetry, or API-key requirements to the default path.
- Ask before publishing, tagging, deleting files, or changing package ownership metadata.

## Verification
- Run `npm run check` after syntax-level changes.
- Run `npm test` after scanner, generator, linter, reporter, or CLI behavior changes.
- Run `node bin/agent-ready.mjs doctor` before release-facing documentation changes.
- For generated docs changes, run `node bin/agent-ready.mjs init --dry-run`.
- If a verification command cannot run locally, document the exact reason.
