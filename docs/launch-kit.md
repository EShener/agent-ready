# agent-ready Launch Kit

This kit contains copy-ready material for sharing `agent-ready` in project updates, community posts, and team discussions.

## Positioning

`agent-ready` makes repositories safer for AI coding agents by turning local setup knowledge into a small, testable contract.

Use it when a repo needs clear instructions for Codex, Claude Code, Cursor, Gemini CLI, GitHub Copilot, or any coding agent that must understand commands, safety boundaries, and verification before editing.

## Primary Links

- Repository: https://github.com/EShener/agent-ready
- Showcase: https://github.com/EShener/agent-ready/blob/main/docs/showcase.md
- Benchmark: https://github.com/EShener/agent-ready/blob/main/BENCHMARK.md
- Latest release: https://github.com/EShener/agent-ready/releases/latest

## Short Pitch

AI coding agents fail when repositories do not tell them how to build, test, and stay safe.

`agent-ready` adds an Agent Readiness Score, generates `AGENTS.md`, checks for instruction drift, creates CI annotations, posts PR summaries, and provides `oss`, `team`, and `enterprise` presets for fast setup.

Try it:

```bash
npx --yes github:EShener/agent-ready improve --preset team --dry-run
```

## Community Post

Title ideas:

- Make any repo ready for AI coding agents in 60 seconds
- I built a zero-dependency readiness checker for AI coding agents
- Stop making every coding agent rediscover your repo from scratch

Post:

AI coding agents are only as good as the repo context they get.

Most repos still do not clearly document the test command, safety boundaries, CI status, canonical agent instructions, or tool-specific guidance for Codex, Claude Code, Cursor, Gemini CLI, and GitHub Copilot.

`agent-ready` is a zero-dependency CLI and GitHub Action that scans a repo and gives it an explainable Agent Readiness Score.

It can:

- generate `AGENTS.md` and small tool-specific shims
- lint agent instructions for missing safety and verification guidance
- create CI annotations and PR comments
- compare before/after readiness scores
- produce multi-repo leaderboards and phased cleanup roadmaps
- apply `oss`, `team`, or `enterprise` presets when you want a full starter plan

Quick start:

```bash
npx --yes github:EShener/agent-ready improve --preset team --dry-run
```

Repo: https://github.com/EShener/agent-ready

## Short Social Posts

Post 1:

AI coding agents should not have to rediscover every repo from scratch.

`agent-ready` scans a codebase, scores its readiness for coding agents, generates `AGENTS.md`, and shows exactly what to fix next.

```bash
npx --yes github:EShener/agent-ready improve --preset team --dry-run
```

https://github.com/EShener/agent-ready

Post 2:

New in `agent-ready`: multi-repo readiness leaderboards and cleanup roadmaps.

Useful if a team wants to see which repos are ready for Codex, Claude Code, Cursor, Gemini CLI, and Copilot.

```bash
npx --yes github:EShener/agent-ready roadmap ../repo-a ../repo-b
```

Post 3:

`AGENTS.md` is useful, but most repos also need verification commands, safety boundaries, CI, and tool-specific shims.

`agent-ready` turns that into a score, a fix plan, and a CI gate.

https://github.com/EShener/agent-ready

## Maintainer Outreach

Use this when opening a friendly issue or discussion in a repo that might benefit from the tool:

````md
I noticed this repo may benefit from explicit AI coding agent instructions.

`agent-ready` can generate a small `AGENTS.md`, detect missing verification commands, and add a lightweight CI readiness check.

Dry-run command:

```bash
npx --yes github:EShener/agent-ready improve --preset team --dry-run --format issue
```

No network calls or API keys are required by the CLI.
````

## First Week Checklist

- [ ] Add GitHub topics: `ai-agents`, `agents-md`, `agentic-coding`, `developer-tools`, `github-action`, `codex`, `cursor`, `claude-code`.
- [ ] Share the short pitch in one builder community.
- [ ] Share the benchmark evidence with one screenshot or GIF.
- [ ] Open 3-5 helpful issues in relevant repos using `improve --preset team --dry-run --format issue`.
- [ ] Share the preset quick start: `improve --preset team --dry-run`.
- [ ] Ask early users which detector or framework support is missing.
- [ ] Convert repeated feedback into small good-first issues.

## What Not To Claim

- Do not claim npm install is available until the package is actually published.
- Do not claim a repository was changed unless `agent-ready fix` or `agent-ready improve` was actually applied.
- Do not claim official support from any coding-agent vendor.
- Keep outreach project-focused; do not invent affiliation, endorsement, or personal usage.
