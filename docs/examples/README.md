# agent-ready Examples

These examples show what `agent-ready` produces before you run it on a real repository.

| Example | What it shows | Command |
| --- | --- | --- |
| [Single repository improvement](single-repo-improvement.md) | Before/after score, planned files, remaining gaps | `agent-ready improve --dry-run` |
| [GitHub issue checklist](issue-checklist.md) | A copy-ready issue body for contributors | `agent-ready improve --dry-run --format issue` |
| [Static readiness snapshot](snapshot.md) | A complete `AGENT_READINESS.md` style report | `agent-ready snapshot` |
| [Multi-repository roadmap](multi-repo-roadmap.md) | A phased team cleanup plan across repositories | `agent-ready roadmap ../repo-a ../repo-b` |

Run the gallery from a terminal:

```bash
npx --yes github:EShener/agent-ready examples
```
