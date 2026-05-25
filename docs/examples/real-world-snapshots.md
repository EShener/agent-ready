# Real-world readiness snapshots

These snapshots show common repository shapes that `agent-ready` is meant to recognize. Paths are abbreviated so the output is portable, and each command can be rerun against an equivalent repository.

## Frontend app: Next.js App Router

Command:

```bash
npx --yes @eshen_fox_mie/agent-ready scan --root test/fixtures/next-app
```

Output excerpt:

```text
fixture-next-app
Primary language: TypeScript
Frameworks: Next.js, React, Vitest, Next.js App Router
Package manager: npm
Commands: install=npm install; dev=npm run dev; build=npm run build; test=npm run test; lint=npm run lint
```

Why it matters: modern frontend repositories often expose framework intent through `next.config.*`, `app/`, and `pages/`, not only through dependencies.

## Service app: Docker Compose

Command:

```bash
npx --yes @eshen_fox_mie/agent-ready scan --root test/fixtures/docker-compose-app
```

Output excerpt:

```text
fixture-docker-compose-app
Primary language: JavaScript
Frameworks: Docker, Docker Compose
Package manager: npm
Commands: install=npm install; test=npm run test; services=docker compose up -d; services:stop=docker compose down
```

Generated `AGENTS.md` also adds local service guidance so agents know when to start and stop dependent services before verification.

## Package workspace: pnpm monorepo

Command:

```bash
npx --yes @eshen_fox_mie/agent-ready scan --root test/fixtures/monorepo
```

Output excerpt:

```text
fixture-monorepo
Primary language: TypeScript
Monorepo: pnpm workspaces, package workspaces, Turborepo (apps/*, packages/*)
Package manager: pnpm
Commands: install=pnpm install; test=pnpm test; lint=pnpm lint
```

Why it matters: AI coding agents need workspace boundaries and root-level commands before they edit packages inside a monorepo.

## CLI/devtool: agent-ready itself

Command:

```bash
npx --yes @eshen_fox_mie/agent-ready doctor --root .
```

Output excerpt from this repository:

```text
agent-ready doctor: @eshen_fox_mie/agent-ready
Score: 100/100 (A)
Primary language: JavaScript
Commands: install=npm install; test=npm run test; lint=npm run lint
Agent docs: .cursor/rules/agent-ready.mdc, .github/copilot-instructions.md, AGENTS.md, CLAUDE.md, GEMINI.md
Status: ready
```

Why it matters: the project uses its own readiness checks, so examples, generated docs, and CI stay aligned with the product promise.
