import { parseTargets } from "./generator.mjs";
import { improveRepo } from "./improver.mjs";

const DEFAULT_TARGETS = ["codex", "claude", "cursor", "gemini", "copilot"];

export async function buildOutreach(options = {}) {
  const root = options.root || process.cwd();
  const targets = options.targets?.length ? options.targets : DEFAULT_TARGETS;
  const improvement = await improveRepo({
    root,
    configPath: options.configPath,
    preset: options.preset || "team",
    targets,
    level: options.level || "team",
    dryRun: true,
    force: false,
    noCi: false,
    mode: options.mode || "npx",
    failUnder: options.failUnder ?? "80",
    comment: false,
  });

  return {
    schemaVersion: 1,
    repository: improvement.repository,
    score: improvement.score,
    findings: improvement.findings,
    plannedFiles: plannedFiles(improvement),
    command: "npx --yes @eshen_fox_mie/agent-ready improve --preset team --dry-run --format issue",
    improvement,
  };
}

export function buildOutreachFromFlags(root, scanOptions, flags = {}) {
  return buildOutreach({
    root,
    configPath: scanOptions.configPath,
    preset: flags.preset || "team",
    level: flags.level || "team",
    mode: flags.mode || "npx",
    failUnder: flags["fail-under"] ?? "80",
    targets: parseTargets(flags.targets),
  });
}

export function renderOutreach(outreach) {
  const delta = outreach.score.estimated ? `estimated +${outreach.score.delta}` : `+${outreach.score.delta}`;
  const planned = outreach.plannedFiles.length
    ? outreach.plannedFiles.map((item) => `- ${item}`).join("\n")
    : "- No files planned for the selected preset.";
  const remaining = outreach.findings.remaining.length
    ? outreach.findings.remaining.map((item) => `- ${item.fixSuggestion} (${item.ruleId})`).join("\n")
    : "- No remaining readiness findings after the planned changes.";

  return `# Agent readiness suggestion for ${outreach.repository.name}

Hi maintainers,

A local dry run suggests this repository could be made easier for AI coding agents and human contributors to work with by adding explicit setup, safety, and verification guidance.

Current readiness: ${outreach.score.before}/100 (${outreach.score.beforeGrade})
Potential readiness: ${outreach.score.after}/100 (${outreach.score.afterGrade}) (${delta})

The dry run would plan:

${planned}

Remaining follow-ups:

${remaining}

You can reproduce the check without writing files:

\`\`\`bash
${outreach.command}
\`\`\`

The CLI is local-first and does not require API keys. If this is not useful, feel free to close this.
`;
}

function plannedFiles(improvement) {
  const changes = improvement.ci
    ? [...improvement.artifacts, { ...improvement.ci, target: "ci" }]
    : improvement.artifacts;
  return changes
    .filter((item) => item.action !== "skipped")
    .map((item) => `${item.action}: ${item.file}${item.target ? ` (${item.target})` : ""}`);
}
