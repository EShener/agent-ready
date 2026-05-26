import path from "node:path";
import { pathExists, writeText } from "./fs-utils.mjs";

const TARGET_FILES = {
  codex: "AGENTS.md",
  claude: "CLAUDE.md",
  cursor: ".cursor/rules/agent-ready.mdc",
  gemini: "GEMINI.md",
  copilot: ".github/copilot-instructions.md",
};

const DEFAULT_TARGETS = ["codex", "claude", "cursor", "gemini", "copilot"];
const FIX_LEVELS = ["basic", "team", "full"];

const TEAM_ARTIFACTS = [
  {
    target: "pull-request-template",
    file: ".github/pull_request_template.md",
    build: buildPullRequestTemplate,
  },
  {
    target: "contributing",
    file: "CONTRIBUTING.md",
    build: buildContributingGuide,
  },
  {
    target: "architecture",
    file: "docs/architecture.md",
    build: buildArchitectureDoc,
  },
  {
    target: "agent-readiness-adr",
    file: "docs/adr/0001-agent-readiness.md",
    build: buildAgentReadinessAdr,
  },
];

const FULL_ARTIFACTS = [
  {
    target: "env-example",
    file: ".env.example",
    build: buildEnvExample,
  },
  {
    target: "codeowners",
    file: ".github/CODEOWNERS",
    build: buildCodeowners,
  },
  {
    target: "agent-readiness-issue-template",
    file: ".github/ISSUE_TEMPLATE/agent-readiness.md",
    build: buildAgentReadinessIssueTemplate,
  },
  {
    target: "security",
    file: "SECURITY.md",
    build: buildSecurityPolicy,
  },
];

export function parseTargets(value) {
  if (!value) return DEFAULT_TARGETS;
  const targets = value.split(",").map((target) => target.trim().toLowerCase()).filter(Boolean);
  const unknown = targets.filter((target) => !TARGET_FILES[target]);
  if (unknown.length) throw new Error(`Unknown target(s): ${unknown.join(", ")}`);
  return [...new Set(targets)];
}

export function parseFixLevel(value) {
  const level = String(value || "basic").trim().toLowerCase();
  if (!FIX_LEVELS.includes(level)) throw new Error(`--level must be one of: ${FIX_LEVELS.join(", ")}.`);
  return level;
}

export async function planGeneratedArtifacts(profile, options = {}) {
  const targets = options.targets || DEFAULT_TARGETS;
  const level = options.level ? parseFixLevel(options.level) : "";
  const artifacts = [];

  for (const target of targets) {
    const file = TARGET_FILES[target];
    const absolute = path.join(profile.root, file);
    artifacts.push({
      target,
      file,
      absolute,
      exists: await pathExists(absolute),
      content: target === "codex" ? buildAgentsMd(profile) : buildTargetShim(target),
    });
  }

  for (const artifact of collaborationArtifacts(level)) {
    const absolute = path.join(profile.root, artifact.file);
    artifacts.push({
      target: artifact.target,
      file: artifact.file,
      absolute,
      exists: await pathExists(absolute),
      content: artifact.build(profile),
    });
  }

  return artifacts;
}

export async function writeGeneratedArtifacts(profile, options = {}) {
  const artifacts = await planGeneratedArtifacts(profile, options);
  const results = [];

  for (const artifact of artifacts) {
    if (artifact.exists && !options.force) {
      results.push({ ...artifact, action: "skipped" });
      continue;
    }
    if (!options.dryRun) await writeText(artifact.absolute, artifact.content);
    results.push({ ...artifact, action: options.dryRun ? "planned" : artifact.exists ? "overwritten" : "created" });
  }

  return results;
}

export function buildAgentsMd(profile) {
  const commands = commandLines(profile.commands);
  const frameworks = profile.frameworks.length ? profile.frameworks.join(", ") : "No framework detected";
  const languages = profile.languages.length
    ? profile.languages.map((language) => `${language.name} (${language.files} files)`).join(", ")
    : "No source files detected";
  const ci = formatCi(profile.ci);
  const architecture = profile.docs.architecture || "Not found";
  const adr = profile.docs.adrDirectory || "Not found";
  const localServices = localServicesSection(profile);
  const monorepo = profile.monorepo?.detected
    ? `${profile.monorepo.tools.join(", ") || "workspaces"} (${profile.monorepo.workspaces.join(", ") || "patterns not declared"})`
    : "Not detected";

  return `# AGENTS.md

## Project Overview
- Name: ${profile.name}
- Primary language: ${profile.primaryLanguage}
- Languages: ${languages}
- Frameworks/tools: ${frameworks}
- Monorepo: ${monorepo}
- CI: ${ci}

## Repository Layout
- Top-level structure: ${formatStructure(profile.structure)}
- Architecture docs: ${architecture}
- ADR directory: ${adr}

## Commands
${commands || "- No standard commands detected yet. Add install, test, lint, and build commands when available."}
${localServices}

## Agent Workflow
- Start by reading this file and the README before editing.
- Use the commands above as the source of truth for verification.
- Keep changes scoped to the requested behavior and follow the existing project style.
- Prefer small, reviewable patches and update tests or docs when behavior changes.

## Safety Boundaries
- Do not modify generated dependency folders such as node_modules, target, dist, build, or coverage.
- Do not rewrite unrelated files or revert user changes.
- Do not touch secrets, credentials, or local environment files.
- Ask before running destructive commands or commands that publish, deploy, or delete data.

## Verification
- Run the smallest relevant test first.
- For behavior changes, run the test command before finishing.
- For formatting or lint-only changes, run the lint command when available.
- If a command is missing or cannot run locally, document the reason in the handoff.
`;
}

function localServicesSection(profile) {
  if (!profile.frameworks.includes("Docker Compose")) return "";
  return `
## Local Services
- Docker Compose config detected. Start dependent services with \`docker compose up -d\` before tests that need local databases, queues, or service dependencies.
- Stop local services with \`docker compose down\` when finished.
`;
}

function buildTargetShim(target) {
  if (target === "claude") {
    return `# CLAUDE.md

Use AGENTS.md as the canonical repository instructions.

Claude-specific note: keep edits small, explain verification clearly, and avoid changing unrelated files.
`;
  }
  if (target === "gemini") {
    return `# GEMINI.md

Use AGENTS.md as the canonical repository instructions.

Gemini-specific note: prefer repository commands over inferred commands, and cite files changed in the final response.
`;
  }
  if (target === "cursor") {
    return `---
description: Repository instructions for AI coding agents
alwaysApply: true
---

Use AGENTS.md as the canonical repository instructions.

Keep generated code aligned with the existing project style and run the relevant verification command before handing off.
`;
  }
  if (target === "copilot") {
    return `# GitHub Copilot Instructions

Use AGENTS.md as the canonical repository instructions.

When suggesting code, preserve existing architecture, keep changes focused, and include tests for behavior changes.
`;
  }
  return "Use AGENTS.md as the canonical repository instructions.\n";
}

function collaborationArtifacts(level) {
  if (!level || level === "basic") return [];
  if (level === "team") return TEAM_ARTIFACTS;
  return [...TEAM_ARTIFACTS, ...FULL_ARTIFACTS];
}

function buildPullRequestTemplate(profile) {
  return `## Summary

- 

## Agent Readiness

- [ ] I read \`AGENTS.md\` before editing.
- [ ] I kept changes scoped to the requested behavior.
- [ ] I updated tests or docs for behavior changes.
- [ ] I ran the relevant verification command.

## Verification

${verificationChecklist(profile)}
`;
}

function buildContributingGuide(profile) {
  const commands = commandLines(profile.commands) || "- Add install, test, lint, and build commands when available.";
  return `# Contributing

Thanks for improving ${profile.name}. Keep changes small, reviewable, and easy to verify.

## Before You Start

- Read \`README.md\` for project context.
- Read \`AGENTS.md\` for repository-specific AI coding instructions.
- Check open issues or pull requests for related work.

## Development Commands

${commands}

## Pull Requests

- Explain what changed and why.
- Include tests or a clear reason when tests are not applicable.
- Run the smallest relevant verification command before requesting review.
- Do not include secrets, credentials, or local environment values.
`;
}

function buildArchitectureDoc(profile) {
  const frameworks = profile.frameworks.length ? profile.frameworks.join(", ") : "No framework detected yet";
  const languages = profile.languages.length ? profile.languages.map((item) => item.name).join(", ") : profile.primaryLanguage;
  const modules = architectureModuleLines(profile);
  return `# Architecture

## Overview

${profile.name} is primarily a ${profile.primaryLanguage} repository. This document gives contributors and AI coding agents a quick map of the codebase before they make changes.

## Technology

- Languages: ${languages}
- Frameworks/tools: ${frameworks}
- Package manager: ${profile.packageManager}
- Monorepo: ${profile.monorepo?.detected ? "yes" : "no"}
- CI: ${formatCi(profile.ci)}

## Repository Layout

- Top-level structure: ${formatStructure(profile.structure)}

${modules}

## Runtime Flow

1. A user or CI job runs a repository command, CLI entry point, application server, or workflow.
2. The implementation reads repository files, package metadata, and optional configuration.
3. Core modules perform detection, validation, generation, or application behavior.
4. Output is written to stdout, generated files, tests, logs, or CI status depending on the command.

## Data Flow

- Inputs: source files, configuration files, command-line flags, package metadata, and CI environment variables.
- Processing: keep parsing and validation deterministic so results are reproducible in local and CI runs.
- Outputs: generated documentation, reports, build artifacts, test results, or workflow annotations.
- External services: none unless the repository-specific commands documented above call them.

## Verification

${verificationChecklist(profile)}
`;
}

function architectureModuleLines(profile) {
  const entries = profile.structure.map((entry) => entry.name);
  const lines = [];

  if (entries.includes("bin")) lines.push("- `bin/`: command-line entry points.");
  if (entries.includes("src")) lines.push("- `src/`: implementation modules and shared logic.");
  if (entries.includes("test")) lines.push("- `test/`: automated tests and fixtures.");
  if (entries.includes("docs")) lines.push("- `docs/`: user-facing documentation, examples, and ADRs.");
  if (entries.includes("scripts")) lines.push("- `scripts/`: maintenance, benchmark, release, or asset-generation helpers.");
  if (entries.includes(".github")) lines.push("- `.github/`: workflows, issue templates, pull request templates, and GitHub-specific instructions.");
  if (entries.includes("app")) lines.push("- `app/`: application routes or runtime entry points.");
  if (entries.includes("packages")) lines.push("- `packages/`: shared packages or workspace modules.");
  if (entries.includes("apps")) lines.push("- `apps/`: deployable applications in the workspace.");

  if (!lines.length) return "## Key Modules\n\n- Add module notes as the repository structure becomes more explicit.";
  return `## Key Modules\n\n${lines.join("\n")}`;
}

function buildAgentReadinessAdr(profile) {
  return `# ADR 0001: Use agent-ready Instructions

## Status

Accepted

## Context

AI coding agents need a reliable handoff file, known verification commands, and clear safety boundaries before editing ${profile.name}.

## Decision

Use \`AGENTS.md\` as the canonical repository instruction file. Tool-specific files such as \`CLAUDE.md\`, \`.cursor/rules/*.mdc\`, \`GEMINI.md\`, and \`.github/copilot-instructions.md\` should stay short and point back to \`AGENTS.md\`.

## Consequences

- Contributors and agents have one source of truth.
- Verification commands are easier to keep current.
- Duplicate tool instructions are less likely to drift.
`;
}

function buildEnvExample() {
  return `# Copy this file to .env for local development.
# Do not commit real secrets or credentials.

# EXAMPLE_API_URL=http://localhost:3000
# EXAMPLE_API_KEY=replace-me
`;
}

function buildCodeowners() {
  return `# Replace the examples below with real owners for this repository.
# See https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners

# * @your-org/maintainers
# /docs/ @your-org/docs
# /.github/ @your-org/platform
`;
}

function buildAgentReadinessIssueTemplate() {
  return `---
name: Agent readiness gap
about: Report missing instructions, verification, or safety boundaries for AI coding agents
labels: agent-readiness
---

## Gap

Describe what an AI coding agent could not understand or verify.

## Expected Guidance

Describe the command, document, safety rule, or workflow that should exist.

## Evidence

Paste relevant \`agent-ready doctor\`, \`agent-ready explain\`, or CI output.
`;
}

function buildSecurityPolicy() {
  return `# Security Policy

## Reporting a Vulnerability

Please do not open public issues for vulnerabilities. Contact the maintainers privately with:

- A description of the issue
- Steps to reproduce
- Potential impact
- Suggested mitigation, if known

## Secrets

Do not commit real credentials, tokens, private keys, or local environment files.
`;
}

function commandLines(commands) {
  const ordered = ["install", "dev", "start", "build", "test", "lint", "format"];
  const names = [
    ...ordered.filter((name) => commands[name]),
    ...Object.keys(commands).filter((name) => commands[name] && !ordered.includes(name)).sort(),
  ];
  return names
    .map((name) => `- ${name}: \`${commands[name]}\``)
    .join("\n");
}

function formatCi(ci) {
  const files = [
    ...(ci?.githubActions || []),
    ...(ci?.gitlabCi || []),
    ...(ci?.circleCi || []),
  ];
  return files.length ? files.join(", ") : "No CI workflows detected";
}

function verificationChecklist(profile) {
  const ordered = ["test", "lint", "build", "format"];
  const lines = ordered
    .filter((name) => profile.commands[name])
    .map((name) => `- [ ] \`${profile.commands[name]}\``);
  return lines.length ? lines.join("\n") : "- [ ] Add the relevant verification command for this change.";
}

function formatStructure(structure) {
  if (!structure.length) return "Empty repository";
  return structure
    .slice(0, 12)
    .map((entry) => `${entry.name}${entry.type === "directory" ? "/" : ""}`)
    .join(", ");
}
