# Example: Static Readiness Snapshot

Command:

```bash
npx --yes github:EShener/agent-ready snapshot
```

Example output:

```md
# Agent Readiness Snapshot

- Repository: fixture-node-app
- Score: 75/100 (B)
- Agent compatibility: 0/5
- Findings: 1 (0 errors, 1 warnings, 0 notices)
- Primary language: TypeScript
- Package manager: npm
- Monorepo: none

fixture-node-app is close. Fix the top deductions to make agent handoffs more reliable.

## Commands
| Kind | Command |
| --- | --- |
| install | `npm install` |
| dev | `npm run dev` |
| build | `npm run build` |
| test | `npm run test` |
| lint | `npm run lint` |

## Agent Compatibility
| Agent | Status | Mode | Files |
| --- | --- | --- | --- |
| OpenAI Codex | missing | missing | missing |
| Cursor | missing | missing | missing |
| GitHub Copilot | missing | missing | missing |
| Claude Code | missing | missing | missing |
| Gemini CLI | missing | missing | missing |

## Top Findings
| Severity | Rule | File | Suggested fix |
| --- | --- | --- | --- |
| warning | missing-agents-md | AGENTS.md | Run `agent-ready init --targets codex`. |
```

Write it to a repository:

```bash
agent-ready snapshot --write
```

Why this is useful:

- Creates a durable report a maintainer can commit or attach to a PR.
- Gives reviewers one file for commands, compatibility, and findings.
- Works well as a status page for teams adopting coding agents.
