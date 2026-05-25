# Example: Single Repository Improvement

Command:

```bash
npx --yes @eshen_fox_mie/agent-ready improve --preset team --dry-run
```

Example output:

```md
# Agent Ready Improvement

- Repository: empty-repo
- Mode: dry-run
- Preset: team
- Level: team
- Score: 40/100 (D) -> 73/100 (C) (estimated +33)
- Findings: 5 -> 3

## Changes
| Action | File | Target |
| --- | --- | --- |
| planned | AGENTS.md | codex |
| planned | CLAUDE.md | claude |
| planned | .cursor/rules/agent-ready.mdc | cursor |
| planned | GEMINI.md | gemini |
| planned | .github/copilot-instructions.md | copilot |
| planned | .github/pull_request_template.md | pull-request-template |
| planned | CONTRIBUTING.md | contributing |
| planned | docs/architecture.md | architecture |
| planned | docs/adr/0001-agent-readiness.md | agent-readiness-adr |
| planned | .github/workflows/agent-ready.yml | ci |

## Remaining Findings
| Severity | Rule | File | Next action |
| --- | --- | --- | --- |
| warning | missing-readme | README.md | Add a README with install, usage, and contribution basics. |
| warning | missing-test-command | package.json | Add a test script or configure the test command in agent-ready.json. |
| info | missing-lint-command | package.json | Add a lint script if the project has automated style checks. |
```

Why this is useful:

- Safe first run: no files are written.
- Shows the score movement before a maintainer commits anything.
- Makes the next fix obvious without reading a long report.
