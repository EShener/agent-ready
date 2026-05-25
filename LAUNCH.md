# Launch Checklist

## Positioning

- One-liner: Make any repository ready for AI coding agents in 60 seconds.
- Audience: developers using Codex, Claude Code, Cursor, Gemini CLI, or Copilot.
- Category: local-first developer tool, agent workflow, repository hygiene.
- Topics: `ai-agents`, `codex`, `claude-code`, `cursor`, `gemini-cli`, `copilot`, `developer-tools`, `cli`.

## Before Publishing

- Run `npm run check`.
- Run `npm test`.
- Run `node bin/agent-ready.mjs score --fail-under 90`.
- Run `npm --cache /private/tmp/agent-ready-npm-cache pack --dry-run`.
- Create a 30 second terminal recording: scan, score, init dry-run, report.
- Add the badge output to the README after the first public release.

## GitHub Repository Setup

- Description: Make any repo ready for AI coding agents in 60 seconds.
- Website: npm package URL after publish.
- Enable issues and discussions.
- Pin a "good first issue" for adding framework detectors.
- Pin a "help wanted" issue for adding more agent targets.

## Launch Copy

### Show HN

Title:

```text
Show HN: agent-ready - make any repo ready for AI coding agents in 60 seconds
```

Body:

```text
I built agent-ready, a zero-dependency CLI that scans a repository, generates AGENTS.md and tool-specific instruction shims for Claude, Cursor, Gemini, and Copilot, then scores the repo's "agent readiness".

The goal is to make AI coding agents less dependent on tribal knowledge: test commands, safety boundaries, repo layout, and verification steps should be explicit and lintable.

It runs fully locally, needs no API key, and is meant to be useful before you adopt any specific agent framework.
```

### Short Post

```text
I built agent-ready: a local-first CLI that makes any repository ready for AI coding agents.

npx @eshen_fox_mie/agent-ready scan
npx @eshen_fox_mie/agent-ready init
npx @eshen_fox_mie/agent-ready score

It generates AGENTS.md plus shims for Claude, Cursor, Gemini, and Copilot, then gives the repo an explainable readiness score.
```
