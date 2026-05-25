# agent-ready Growth Playbook

This playbook keeps launch work focused on useful, verifiable claims: helping maintainers make repositories safer for AI coding agents.

## Positioning

Short version:

> `agent-ready` turns repository setup knowledge into a score, generated `AGENTS.md`, CI feedback, and copy-ready improvement plans for Codex, Claude Code, Cursor, Gemini CLI, and GitHub Copilot.

Primary call to action:

```bash
npx --yes @eshen_fox_mie/agent-ready improve --preset team --dry-run
```

## Audience

| Audience | Pain | Hook |
| --- | --- | --- |
| Open-source maintainers | Contributors and agents miss setup rules | Give the repo a readable agent contract |
| AI coding tool users | Each agent needs repeated context | Generate one canonical `AGENTS.md` plus tool shims |
| Platform/devtools teams | Many repos have uneven readiness | Score, benchmark, and roadmap repositories |
| Engineering managers | AI changes need verification discipline | Add CI annotations and PR comments |

## Launch Angles

1. **60-second repo check**
   - Show the `doctor` or `improve --preset team --dry-run` output.
   - Best asset: terminal screenshot or demo GIF.

2. **AGENTS.md without drift**
   - Explain that tool-specific files are shims pointing to one canonical file.
   - Best asset: compatibility matrix.

3. **Team readiness dashboard**
   - Use `leaderboard` and `roadmap` across multiple repos.
   - Best asset: Markdown leaderboard snippet.

4. **PR feedback loop**
   - Show the GitHub Action comment with score, matrix, and top fixes.
   - Best asset: `docs/assets/agent-ready-pr-comment.gif`.

## Seven-Day Operating Rhythm

| Day | Action | Output |
| --- | --- | --- |
| 1 | Publish announcement discussion and share the npm quick start | One canonical GitHub link |
| 2 | Share the GIF and PR-comment workflow | Visual proof |
| 3 | Post the benchmark angle | Evidence that the problem is common |
| 4 | Open 1-2 helpful issues in relevant repos | Non-spammy targeted outreach |
| 5 | Ask for detector requests | Community feedback |
| 6 | Ship one small detector or docs improvement | Visible momentum |
| 7 | Post a weekly progress note | Reasons to revisit/star |

## Copy-Ready Posts

### Short Launch

````md
AI coding agents fail when repos do not tell them how to build, test, and stay safe.

`agent-ready` is a zero-dependency CLI and GitHub Action that scores a repo, generates `AGENTS.md`, adds tool-specific shims, and can post PR readiness comments.

Try it:

```bash
npx --yes @eshen_fox_mie/agent-ready improve --preset team --dry-run
```

Repo: https://github.com/EShener/agent-ready
````

### Maintainer Outreach

````md
I noticed this repo may benefit from explicit AI coding agent instructions.

`agent-ready` can generate a small `AGENTS.md`, detect missing verification commands, and add a lightweight CI readiness check.

Dry-run command:

```bash
npx --yes @eshen_fox_mie/agent-ready improve --preset team --dry-run --format issue
```

No API keys are required by the CLI, and the dry run does not write files.
````

### Discussion Prompt

```md
What does your repo need before you trust an AI coding agent to open a PR?

I am collecting missing framework detectors and readiness rules for `agent-ready`.

Useful examples: Next.js, Astro, SvelteKit, Rails, Django, Docker Compose, monorepo CI, generated SDKs.
```

## Metrics

Track weekly:

- GitHub stars
- npm downloads
- Discussion replies
- New issues opened by non-maintainers
- Repos that mention `agent-ready`
- Repeated detector requests

## Guardrails

- Do not claim official vendor support from OpenAI, Anthropic, Cursor, Google, or GitHub.
- Do not claim a repository was changed unless a write command actually ran.
- Do not open generic promotional issues. Use the dry-run output and explain a concrete repo-specific gap.
- Do not hide automation or invent personal usage stories.
