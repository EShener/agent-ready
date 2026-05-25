# Example: Multi-Repository Roadmap

Command:

```bash
npx --yes @eshen_fox_mie/agent-ready roadmap ../repo-a ../repo-b
```

Example output:

```md
# Agent Readiness Roadmap

- Repositories scanned: 2
- Average score: 52/100
- Ready repositories: 0
- Needs work: 1

## Phase 1: Establish Agent Handoff

Create the minimum shared contract every coding agent should read before editing.

- [ ] Add canonical `AGENTS.md` instructions (`bad-agent-docs`, `fixture-node-app`)
  - Rule: `missing-agents-md`
  - Fix: Run `agent-ready init --targets codex`.
- [ ] Add or refresh README basics (`bad-agent-docs`)
  - Rule: `missing-readme`
  - Fix: Add a README with install, usage, and contribution basics.

## Phase 2: Make Verification Trustworthy

Ensure agents can run checks and trust CI before handing off changes.

- [ ] Add a CI workflow agents can trust (`bad-agent-docs`)
  - Rule: `missing-ci`
  - Fix: Add CI so agents can trust the verification path.
- [ ] Document or add a lint command (`bad-agent-docs`)
  - Rule: `missing-lint-command`
  - Fix: Add a lint script if the project has automated style checks.

## Phase 3: Reduce Instruction Drift

Keep agent guidance compact, current, and safe across tools.

- [ ] Add safety boundaries to agent instructions (`bad-agent-docs`)
  - Rule: `missing-safety-section`
  - Fix: Add a short safety section covering destructive commands and secrets.
```

Why this is useful:

- Moves from one-off cleanup to a team operating plan.
- Shows which repositories are affected by each repeated readiness gap.
- Helps platform teams prioritize the highest-leverage fixes first.
