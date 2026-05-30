# Detector Coverage

`agent-ready scan` collects repository facts that make generated agent instructions useful: languages, framework/tooling signals, package managers, common commands, CI, docs, and monorepo layout.

This page summarizes the current detector coverage. Claims here should stay aligned with fixtures and tests.

## Ecosystem Coverage

| Ecosystem | Detected signals | Frameworks/tools | Inferred commands |
| --- | --- | --- | --- |
| JavaScript / TypeScript | `package.json`, lockfiles, package scripts, framework configs, route/component conventions | React, Vite, Next.js, Next.js App Router, Vue, Nuxt, Astro, Svelte, SvelteKit, Express, NestJS, Vitest, Jest, Playwright, Storybook | package manager install, `dev`, `start`, `build`, `test`, `lint`, `format` from scripts |
| Python | `pyproject.toml`, `requirements.txt`, `setup.py`, `poetry.lock`, `pdm.lock`, `uv.lock`, `[tool.poetry]`, `[tool.pdm]`, `[tool.uv]`, `tests/` | FastAPI, Django, Flask, Pytest, Ruff, Poetry, PDM, uv | pip/Poetry/PDM/uv install commands, Pytest, Ruff lint/format through the detected package manager |
| Ruby | `Gemfile`, `config/application.rb`, `bin/rails` | Rails | `bundle install`, `bin/rails server`, `bin/rails test` |
| PHP | `composer.json`, `artisan`, `app/Http/Kernel.php` | Laravel | `composer install`, `php artisan serve`, `php artisan test` |
| C# / .NET | `*.csproj`, `*.sln`, `global.json`, `Program.cs` | .NET | `dotnet restore`, `dotnet build`, `dotnet test` |
| Java / Kotlin | `pom.xml`, `mvnw`, `build.gradle`, `build.gradle.kts`, `gradlew`, Spring Boot plugins/dependencies | Spring Boot | `./mvnw package`, `./mvnw test`, `./gradlew build`, `./gradlew test` |
| Rust | `Cargo.toml` | Actix, Axum, Rocket as Rust Web | `cargo build`, `cargo test`, `cargo clippy --all-targets --all-features`, `cargo fmt` |
| Go | `go.mod` | Gin | `go build ./...`, `go test ./...`, `go vet ./...`, `gofmt -w .` |
| Containers | `Dockerfile`, `docker-compose.yml`, `docker-compose.yaml`, `compose.yml`, `compose.yaml` | Docker, Docker Compose | `docker compose up -d`, `docker compose down` |
| Monorepos | `workspaces`, `pnpm-workspace.yaml`, `turbo.json`, `nx.json`, `lerna.json`, `rush.json` | npm workspaces, pnpm workspaces, Turborepo, Nx, Lerna, Rush | root package manager scripts when present |
| CI and docs | `.github/workflows/*.yml`, `.github/workflows/*.yaml`, `.gitlab-ci.yml`, `.gitlab-ci.yaml`, `.circleci/config.yml`, `.circleci/config.yaml`, `README.md`, architecture docs, `docs/adr/`, existing agent docs | GitHub Actions, GitLab CI, CircleCI, AGENTS.md, Claude, Cursor, Gemini, Copilot shims | readiness reporting and generated instructions reference detected paths |

## Framework Signals

| Framework/tool | Signals |
| --- | --- |
| Next.js | `next` dependency, `next.config.*`, App Router files under `app/`, Pages Router files under `pages/` |
| Next.js App Router | `app/**/(layout|page|route|loading|error|not-found).tsx?` or `.jsx?` |
| Astro | `astro` dependency, `astro.config.*`, `.astro` files under pages/layouts/components |
| SvelteKit | `@sveltejs/kit`, `svelte.config.*`, `src/routes/+page.svelte`, `+layout`, `+server`, `+error` route files |
| Nuxt | `nuxt`, `@nuxt/kit`, `nuxt.config.*`, `app.vue`, `pages/`, `app/`, or `server/` conventions |
| Rails | `Gemfile` containing `rails`, `config/application.rb`, `bin/rails` |
| Laravel | `composer.json` with `laravel/framework`, `artisan`, `app/Http/Kernel.php` |
| .NET | `*.csproj`, `*.sln`, `global.json`, `Program.cs` |
| Spring Boot | Spring Boot references in `pom.xml`, `build.gradle`, or `build.gradle.kts` |
| Docker Compose | Compose files named `docker-compose.yml`, `docker-compose.yaml`, `compose.yml`, or `compose.yaml` |

## CI Signals

| Provider | Signals |
| --- | --- |
| GitHub Actions | Workflow files under `.github/workflows/*.yml` or `.github/workflows/*.yaml` |
| GitLab CI | `.gitlab-ci.yml` or `.gitlab-ci.yaml` at the repository root |
| CircleCI | `.circleci/config.yml` or `.circleci/config.yaml` |

## Notes

- Configured commands in `agent-ready.json` override detected commands.
- For hybrid apps, backend setup can be preserved as `backend:install` when frontend package scripts already define `install`.
- The scanner does not run package managers, inspect remote services, or call external APIs.
