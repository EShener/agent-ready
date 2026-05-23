# ADR 0001: Use agent-ready Instructions

## Status

Accepted

## Context

AI coding agents need a reliable handoff file, known verification commands, and clear safety boundaries before editing agent-ready.

## Decision

Use `AGENTS.md` as the canonical repository instruction file. Tool-specific files such as `CLAUDE.md`, `.cursor/rules/*.mdc`, `GEMINI.md`, and `.github/copilot-instructions.md` should stay short and point back to `AGENTS.md`.

## Consequences

- Contributors and agents have one source of truth.
- Verification commands are easier to keep current.
- Duplicate tool instructions are less likely to drift.
