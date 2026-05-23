# Agent Readiness Benchmark

This snapshot shows how `agent-ready benchmark` behaves on public AI and developer-tool repositories.

Low scores do not mean a project is low quality. The score only measures whether a repository gives AI coding agents explicit handoff instructions, verification commands, safety boundaries, and low-drift tool guidance.

## Snapshot

- Date: 2026-05-23
- Command: `node bin/agent-ready.mjs benchmark --root /private/tmp/agent-ready-benchmark-v013 openai-node vercel-ai mcp-typescript-sdk anthropic-sdk-typescript browser-use opencode`
- Repositories: 6
- Average score: 28/100

| Rank | Repository | Sample commit | Score | Grade | Language | Frameworks | Agent docs | Findings | Top fixes |
| --- | --- | --- | ---: | --- | --- | --- | ---: | ---: | --- |
| 1 | [anthropics/anthropic-sdk-typescript](https://github.com/anthropics/anthropic-sdk-typescript) | `32ce8c0` | 63 | C | TypeScript | Jest | 0 | 2 | invalid-package-script, missing-agents-md |
| 2 | [openai/openai-node](https://github.com/openai/openai-node) | `2002111` | 63 | C | TypeScript | Jest | 0 | 2 | invalid-package-script, missing-agents-md |
| 3 | [sst/opencode](https://github.com/sst/opencode) | `7d2c1ce` | 44 | D | TypeScript | none | 1 | 7 | stale-path-reference |
| 4 | [modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk) | `5fc42e9` | 0 | F | TypeScript | Vitest | 1 | 51 | invalid-package-script, missing-agents-md, missing-safety-section |
| 5 | [vercel/ai](https://github.com/vercel/ai) | `9f1e1ba` | 0 | F | JavaScript | Next.js, React, Vitest, Playwright | 2 | 45 | invalid-package-script, missing-readme, stale-path-reference |
| 6 | [browser-use/browser-use](https://github.com/browser-use/browser-use) | `5a745a8` | 0 | F | Python | FastAPI, Pytest | 2 | 46 | stale-path-reference |

## Reproduce

Run the sample benchmark against pinned shallow checkouts:

```bash
npm run benchmark:sample
```

Use a custom checkout directory:

```bash
AGENT_READY_BENCHMARK_DIR=/tmp/agent-ready-sample npm run benchmark:sample
```

Or benchmark local repositories directly:

```bash
agent-ready benchmark ../repo-a ../repo-b ../repo-c
```

## What This Shows

- Even mature AI/devtool repositories often lack canonical `AGENTS.md` guidance.
- Agent-specific docs can drift when they duplicate long instructions instead of pointing to one source of truth.
- Scores improve quickly when repositories add explicit test commands, safety boundaries, and compact agent handoff notes.
