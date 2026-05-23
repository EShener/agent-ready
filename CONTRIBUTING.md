# Contributing

Thanks for improving `agent-ready`.

## Local Setup

```bash
npm install
npm run check
npm test
```

## Development Rules

- Keep the default CLI path local-first: no network calls, no telemetry, no API keys.
- Keep runtime dependencies at zero unless the benefit is concrete and hard to reproduce with Node built-ins.
- Add a fixture when changing scanner behavior.
- Add or update tests when changing command output, scoring, lint rules, or generated files.
- Prefer deterministic output so generated reports are stable in CI.

## Useful Commands

```bash
node bin/agent-ready.mjs scan --root test/fixtures/node-app
node bin/agent-ready.mjs doctor --root test/fixtures/node-app
node bin/agent-ready.mjs init --root test/fixtures/node-app --dry-run
node bin/agent-ready.mjs report --root test/fixtures/node-app
node bin/agent-ready.mjs badge --root test/fixtures/node-app
```
