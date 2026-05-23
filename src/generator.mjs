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

export function parseTargets(value) {
  if (!value) return DEFAULT_TARGETS;
  const targets = value.split(",").map((target) => target.trim().toLowerCase()).filter(Boolean);
  const unknown = targets.filter((target) => !TARGET_FILES[target]);
  if (unknown.length) throw new Error(`Unknown target(s): ${unknown.join(", ")}`);
  return [...new Set(targets)];
}

export async function planGeneratedArtifacts(profile, options = {}) {
  const targets = options.targets || DEFAULT_TARGETS;
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
  const ci = profile.ci.githubActions.length ? profile.ci.githubActions.join(", ") : "No GitHub Actions workflows detected";
  const architecture = profile.docs.architecture || "Not found";
  const adr = profile.docs.adrDirectory || "Not found";

  return `# AGENTS.md

## Project Overview
- Name: ${profile.name}
- Primary language: ${profile.primaryLanguage}
- Languages: ${languages}
- Frameworks/tools: ${frameworks}
- CI: ${ci}

## Repository Layout
- Top-level structure: ${formatStructure(profile.structure)}
- Architecture docs: ${architecture}
- ADR directory: ${adr}

## Commands
${commands || "- No standard commands detected yet. Add install, test, lint, and build commands when available."}

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

function commandLines(commands) {
  const ordered = ["install", "dev", "start", "build", "test", "lint", "format"];
  return ordered
    .filter((name) => commands[name])
    .map((name) => `- ${name}: \`${commands[name]}\``)
    .join("\n");
}

function formatStructure(structure) {
  if (!structure.length) return "Empty repository";
  return structure
    .slice(0, 12)
    .map((entry) => `${entry.name}${entry.type === "directory" ? "/" : ""}`)
    .join(", ");
}
