# Example: Single Repository Improvement

Command:

```bash
npx --yes github:EShener/agent-ready improve --dry-run
```

Example output:

```md
# Agent Ready Improvement

- Repository: empty-repo
- Mode: dry-run
- Level: basic
- Score: 40/100 (D) -> 65/100 (C) (estimated +25)
- Findings: 5 -> 4

## Changes
| Action | File | Target |
| --- | --- | --- |
| planned | AGENTS.md | codex |
| planned | CLAUDE.md | claude |
| planned | .cursor/rules/agent-ready.mdc | cursor |
| planned | GEMINI.md | gemini |
| planned | .github/copilot-instructions.md | copilot |

## Remaining Findings
| Severity | Rule | File | Next action |
| --- | --- | --- | --- |
| warning | missing-readme | README.md | Add a README with install, usage, and contribution basics. |
| warning | missing-test-command | package.json | Add a test script or configure the test command in agent-ready.json. |
| info | missing-ci | .github/workflows | Add CI so agents can trust the verification path. |
| info | missing-lint-command | package.json | Add a lint script if the project has automated style checks. |
```

Why this is useful:

- Safe first run: no files are written.
- Shows the score movement before a maintainer commits anything.
- Makes the next fix obvious without reading a long report.
