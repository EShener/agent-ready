# Outreach Automation

This project includes a local outreach operator for steady, low-noise growth work.

## What It Does

The operator:

- searches GitHub for AI coding agent, agentic coding, local-first agent, and developer-tooling repositories
- skips archived repos, forks, this repository, and recently contacted repositories
- clones a small shortlist into `.agent-ready/outreach/repos/`
- runs `agent-ready outreach` locally against each candidate
- writes a review inbox to `.agent-ready/outreach/inbox.md`
- keeps a local ledger at `.agent-ready/outreach/ledger.json`

Default mode is draft-only. The scheduled job does not publish public GitHub issues.

## Run Manually

```bash
npm run outreach:operator
```

The report is written to:

```text
.agent-ready/outreach/inbox.md
```

## Public Posting Guardrail

Public posting is intentionally off by default. To create issues, both conditions must be true:

```bash
AGENT_READY_OUTREACH_POST=1 node scripts/outreach-operator.mjs --post --max-posts 1
```

Keep `--max-posts` small. Outreach should stay specific, useful, and tied to a real readiness gap.

## Local Schedule

The macOS LaunchAgent template in `ops/com.eshen.agent-ready-outreach.plist` runs the draft-only operator every day at 10:30 local time.

Install or refresh it with:

```bash
mkdir -p ~/Library/LaunchAgents
cp ops/com.eshen.agent-ready-outreach.plist ~/Library/LaunchAgents/
launchctl unload ~/Library/LaunchAgents/com.eshen.agent-ready-outreach.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.eshen.agent-ready-outreach.plist
```

Logs are written to `.agent-ready/outreach/`.

If `~/Library/LaunchAgents` is not writable, use a user crontab instead:

```bash
(crontab -l 2>/dev/null | grep -v 'agent-ready outreach operator'; printf '30 10 * * * /Users/bigo/Desktop/agent-ready/scripts/run-outreach-operator.sh # agent-ready outreach operator\n') | crontab -
```
