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

## Frontend app: SvelteKit

Command:

```bash
npx --yes @eshen_fox_mie/agent-ready scan --root test/fixtures/sveltekit-app
```

Output excerpt:

```text
fixture-sveltekit-app
Primary language: Svelte
Frameworks: Vite, Svelte, SvelteKit, Vitest
Package manager: npm
Commands: install=npm install; dev=npm run dev; build=npm run build; test=npm run test
```

Why it matters: SvelteKit repositories reveal app structure through `svelte.config.*` and `src/routes/+page.svelte` conventions.

## Frontend app: Nuxt

Command:

```bash
npx --yes @eshen_fox_mie/agent-ready scan --root test/fixtures/nuxt-app
```

Output excerpt:

```text
fixture-nuxt-app
Primary language: Vue
Frameworks: Vue, Nuxt, Vitest
Package manager: npm
Commands: install=npm install; dev=npm run dev; build=npm run build; test=npm run test
```

Why it matters: Nuxt repositories may expose framework identity through `nuxt.config.*`, `app.vue`, `pages/`, and `server/`.

## Backend app: Rails

Command:

```bash
npx --yes @eshen_fox_mie/agent-ready scan --root test/fixtures/rails-app
```

Output excerpt:

```text
rails-app
Primary language: Ruby
Frameworks: Rails
Package manager: bundler
Commands: install=bundle install; dev=bin/rails server; test=bin/rails test
```

Why it matters: Rails repositories need agents to use framework entrypoints like `bin/rails` instead of guessing generic Ruby commands.

## Backend app: Laravel

Command:

```bash
npx --yes @eshen_fox_mie/agent-ready scan --root test/fixtures/laravel-app
```

Output excerpt:

```text
fixture-laravel-app
Primary language: PHP
Frameworks: Laravel
Package manager: composer
Commands: install=composer install; dev=php artisan serve; test=php artisan test
```

Why it matters: Laravel repositories often rely on Composer and `artisan` commands that should be explicit in generated agent instructions.

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
