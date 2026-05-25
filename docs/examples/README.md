# agent-ready Examples

These examples show what `agent-ready` produces before you run it on a real repository.

| Example | What it shows | Command |
| --- | --- | --- |
| [Single repository improvement](single-repo-improvement.md) | Before/after score, planned files, remaining gaps | `agent-ready improve --preset team --dry-run` |
| [GitHub issue checklist](issue-checklist.md) | A copy-ready issue body for contributors | `agent-ready improve --preset team --dry-run --format issue` |
| [Static readiness snapshot](snapshot.md) | A complete `AGENT_READINESS.md` style report | `agent-ready snapshot` |
| [Real-world readiness snapshots](real-world-snapshots.md) | Frontend, Docker Compose, monorepo, and CLI/devtool scan excerpts | `agent-ready scan --root <repo>` |
| [Multi-repository roadmap](multi-repo-roadmap.md) | A phased team cleanup plan across repositories | `agent-ready roadmap ../repo-a ../repo-b` |

Run the gallery from a terminal:

```bash
npx --yes @eshen_fox_mie/agent-ready examples
```
