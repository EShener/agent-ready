# Example: GitHub Issue Checklist

Command:

```bash
npx --yes github:EShener/agent-ready improve --preset team --dry-run --format issue
```

Example output:

```md
# Improve agent readiness for empty-repo

## Score

- Current: 40/100 (D)
- Target: 73/100 (C) (estimated +33)
- Findings: 5 -> 3
- Mode: dry-run
- Preset: team
- Level: team

## Planned Work

- [ ] Add `AGENTS.md` (codex)
- [ ] Add `CLAUDE.md` (claude)
- [ ] Add `.cursor/rules/agent-ready.mdc` (cursor)
- [ ] Add `GEMINI.md` (gemini)
- [ ] Add `.github/copilot-instructions.md` (copilot)
- [ ] Add `.github/pull_request_template.md` (pull-request-template)
- [ ] Add `CONTRIBUTING.md` (contributing)
- [ ] Add `docs/architecture.md` (architecture)
- [ ] Add `docs/adr/0001-agent-readiness.md` (agent-readiness-adr)
- [ ] Add `.github/workflows/agent-ready.yml` (ci)

## Remaining Follow-Ups

- [ ] Add a README with install, usage, and contribution basics. (missing-readme, `README.md`)
- [ ] Add a test script or configure the test command in agent-ready.json. (missing-test-command, `package.json`)
- [ ] Add a lint script if the project has automated style checks. (missing-lint-command, `package.json`)

## Verification

- [ ] Run `agent-ready doctor`
- [ ] Run `agent-ready score --fail-under 80`
- [ ] Run the repository test command before merging
```

Why this is useful:

- Maintainers can paste it into a GitHub issue without rewriting the output.
- Contributors get concrete files and verification steps.
- Teams can turn readiness cleanup into small tasks instead of a vague platform initiative.
