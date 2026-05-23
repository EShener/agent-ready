# Security Policy

`agent-ready` is local-first. The default CLI path does not make network calls, collect telemetry, or require API keys.

## Reporting Security Issues

Please do not open public issues for vulnerabilities.

Email the maintainer or open a private security advisory on GitHub with:

- Affected version or commit
- Reproduction steps
- Impact
- Suggested fix, if known

## Scope

In scope:

- Unsafe file writes outside the target repository
- Secret exposure in generated reports
- Command execution beyond documented verification behavior
- Supply-chain risk in package metadata or release artifacts

Out of scope:

- Reports that require malicious local repository contents and no data exposure
- Generic advice about prompt injection without a concrete exploit path
