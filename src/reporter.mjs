export function renderScanSummary(profile) {
  return [
    `${profile.name}`,
    `Root: ${profile.root}`,
    `Primary language: ${profile.primaryLanguage}`,
    `Languages: ${profile.languages.map((item) => `${item.name} (${item.files})`).join(", ") || "none"}`,
    `Frameworks: ${profile.frameworks.join(", ") || "none"}`,
    `Monorepo: ${formatMonorepo(profile.monorepo)}`,
    `Package manager: ${profile.packageManager}`,
    `Commands: ${Object.entries(profile.commands).filter(([, value]) => value).map(([key, value]) => `${key}=${value}`).join("; ") || "none"}`,
    `Agent docs: ${profile.agentDocs.map((doc) => doc.file).join(", ") || "none"}`,
  ].join("\n");
}

export function renderFindings(findings) {
  if (!findings.length) return "No findings.";
  return findings
    .map((finding) => `[${finding.severity}] ${finding.ruleId}: ${finding.message} (${finding.file})\n  Fix: ${finding.fixSuggestion}`)
    .join("\n");
}

export function renderAnnotations(findings) {
  if (!findings.length) return "::notice title=agent-ready::No findings.";
  return findings.map((finding) => {
    const level = annotationLevel(finding.severity);
    const properties = [
      `file=${escapeAnnotationProperty(finding.file || ".")}`,
      `title=${escapeAnnotationProperty(finding.ruleId)}`,
    ].join(",");
    const message = escapeAnnotationMessage(`${finding.message} Fix: ${finding.fixSuggestion}`);
    return `::${level} ${properties}::${message}`;
  }).join("\n");
}

export function renderScore(score) {
  const lines = [
    `Agent Readiness Score: ${score.score}/100 (${score.grade})`,
    score.summary,
  ];
  if (score.deductions.length) {
    lines.push("");
    lines.push("Deductions:");
    for (const deduction of score.deductions) {
      lines.push(`- ${deduction.points} pts: ${deduction.message}`);
    }
  }
  return lines.join("\n");
}

export function renderDoctor(profile, findings, score) {
  const lines = [
    `agent-ready doctor: ${profile.name}`,
    `Score: ${score.score}/100 (${score.grade})`,
    `Primary language: ${profile.primaryLanguage}`,
    `Monorepo: ${formatMonorepo(profile.monorepo)}`,
    `Commands: ${Object.entries(profile.commands).filter(([, value]) => value).map(([key, value]) => `${key}=${value}`).join("; ") || "none"}`,
    `Agent docs: ${profile.agentDocs.map((doc) => doc.file).join(", ") || "none"}`,
    "",
  ];

  if (!findings.length) {
    lines.push("Status: ready");
    lines.push("Next: keep AGENTS.md short, current, and verified in CI.");
    return lines.join("\n");
  }

  lines.push("Top fixes:");
  for (const finding of findings.slice(0, 5)) {
    lines.push(`- [${finding.severity}] ${finding.message}`);
    lines.push(`  ${finding.fixSuggestion}`);
  }
  lines.push("");
  lines.push("Next: run `agent-ready init --dry-run`, apply the relevant files, then run `agent-ready score` again.");
  return lines.join("\n");
}

export function renderBadge(score, format = "markdown") {
  const encodedScore = encodeURIComponent(`${score.score}/100`);
  const color = badgeColor(score.score);
  const url = `https://img.shields.io/badge/agent--ready-${encodedScore}-${color}`;
  if (format === "url") return url;
  if (format === "json") {
    return JSON.stringify({ label: "agent-ready", score: score.score, grade: score.grade, color, url }, null, 2);
  }
  if (format !== "markdown") throw new Error("Badge format must be markdown, url, or json.");
  return `![agent-ready](${url})`;
}

export function renderBenchmarkReport(benchmark) {
  const rows = benchmark.repos.length
    ? benchmark.repos.map((repo, index) => {
        const frameworks = repo.frameworks.length ? repo.frameworks.join(", ") : "none";
        const topFixes = repo.topFindings.length
          ? repo.topFindings.map((finding) => finding.ruleId).join(", ")
          : "ready";
        return [
          index + 1,
          escapePipe(repo.name),
          repo.score,
          repo.grade,
          escapePipe(repo.primaryLanguage),
          escapePipe(frameworks),
          repo.agentDocs,
          repo.findings,
          escapePipe(topFixes),
        ].join(" | ");
      }).map((row) => `| ${row} |`).join("\n")
    : "| - | none | 0 | - | - | - | 0 | 0 | - |";

  return `# Agent Readiness Benchmark

- Repositories: ${benchmark.count}
- Average score: ${benchmark.averageScore}/100
- Generated: ${benchmark.generatedAt}

| Rank | Repository | Score | Grade | Language | Frameworks | Agent docs | Findings | Top fixes |
| --- | --- | ---: | --- | --- | --- | ---: | ---: | --- |
${rows}
`;
}

export function renderLeaderboard(benchmark) {
  const rows = benchmark.repos.length
    ? benchmark.repos.map((repo, index) => {
        const topFix = repo.topFindings[0]?.ruleId || "ready";
        return `| ${index + 1} | ${escapePipe(repo.name)} | ${repo.score}/100 | ${repo.grade} | ${repo.agentDocs} | ${repo.findings} | ${escapePipe(topFix)} |`;
      }).join("\n")
    : "| - | none | 0/100 | - | 0 | 0 | - |";
  const gapRows = benchmark.commonFindings?.length
    ? benchmark.commonFindings.map((item) => `| ${item.count} | ${escapePipe(item.ruleId)} | ${item.severity} | ${escapePipe(item.fixSuggestion)} |`).join("\n")
    : "| 0 | none | ok | No common readiness gaps. |";
  const best = benchmark.repos[0];
  const weakest = benchmark.repos[benchmark.repos.length - 1];
  const bestLine = best ? `${best.name} (${best.score}/100)` : "none";
  const weakestLine = weakest ? `${weakest.name} (${weakest.score}/100)` : "none";

  return `# Agent Readiness Leaderboard

- Repositories scanned: ${benchmark.count}
- Average score: ${benchmark.averageScore}/100
- Ready repositories: ${benchmark.readyCount || 0}
- Needs work: ${benchmark.needsWorkCount || 0}
- Best: ${escapePipe(bestLine)}
- Biggest opportunity: ${escapePipe(weakestLine)}
- Generated: ${benchmark.generatedAt}

## Ranking
| Rank | Repository | Score | Grade | Agent docs | Findings | Top fix |
| --- | --- | ---: | --- | ---: | ---: | --- |
${rows}

## Most Common Gaps
| Repos | Rule | Severity | Suggested fix |
| ---: | --- | --- | --- |
${gapRows}

## Share Snippet

AI coding agents work better when repositories document commands, safety boundaries, and verification paths.

This scan covered ${benchmark.count} repositories. Average Agent Readiness Score: ${benchmark.averageScore}/100. Most common gap: ${benchmark.commonFindings?.[0]?.ruleId || "none"}.

Run:

\`\`\`bash
npx --yes github:EShener/agent-ready leaderboard <repo-a> <repo-b>
\`\`\`
`;
}

export function renderRoadmap(benchmark) {
  const phases = buildRoadmapPhases(benchmark.commonFindings || []);
  const phaseBlocks = phases.map((phase) => {
    const tasks = phase.items.length
      ? phase.items.map((item) => {
          const repos = item.repositories?.length ? item.repositories.map((repo) => `\`${repo}\``).join(", ") : `${item.count} repos`;
          return `- [ ] ${roadmapAction(item.ruleId)} (${repos})\n  - Rule: \`${item.ruleId}\`\n  - Fix: ${item.fixSuggestion}`;
        }).join("\n")
      : "- [x] No matching gaps in this phase.";
    return `## ${phase.name}\n\n${phase.description}\n\n${tasks}`;
  }).join("\n\n");

  return `# Agent Readiness Roadmap

- Repositories scanned: ${benchmark.count}
- Average score: ${benchmark.averageScore}/100
- Ready repositories: ${benchmark.readyCount || 0}
- Needs work: ${benchmark.needsWorkCount || 0}
- Generated: ${benchmark.generatedAt}

${phaseBlocks}

## Operating Rhythm

- [ ] Run \`agent-ready leaderboard\` weekly until average score is above 90.
- [ ] Use \`agent-ready improve --preset team --dry-run --format issue\` to open focused cleanup issues.
- [ ] Add \`agent-ready ci --write\` once repositories have baseline instructions and verification commands.

Generated by \`agent-ready roadmap\`.
`;
}

export function renderExplanation(explanation) {
  const rows = explanation.items.length
    ? explanation.items.map((item) => `| +${item.points} | ${escapePipe(item.ruleId)} | ${item.severity} | ${escapePipe(item.file)} | ${escapePipe(item.why)} | ${escapePipe(item.fixSuggestion)} |`).join("\n")
    : "| 0 | none | ok |  | No fixes needed. | Keep instructions compact and current. |";

  return `# Agent Ready Fix Plan

- Repository: ${explanation.repository.name}
- Current score: ${explanation.score.current}/100 (${explanation.score.grade})
- Potential score: ${explanation.score.potentialScore}/100 (+${explanation.score.potentialGain})

${explanation.score.summary}

| Impact | Rule | Severity | File | Why it matters | Fix |
| ---: | --- | --- | --- | --- | --- |
${rows}
`;
}

export function renderExamplesCatalog(catalog) {
  const rows = catalog.examples.length
    ? catalog.examples.map((example) => `| ${escapePipe(example.title)} | \`${example.command}\` | [${escapePipe(example.file)}](${example.file}) | ${escapePipe(example.useCase)} |`).join("\n")
    : "| none |  |  | No examples available. |";

  return `# agent-ready Examples

Use these examples to understand the output before running \`agent-ready\` on a real repository.

| Example | Command | File | Use case |
| --- | --- | --- | --- |
${rows}

Tip: start with \`agent-ready improve --preset team --dry-run\` for a safe preview, then use \`agent-ready improve --preset team --dry-run --format issue\` when you want a GitHub-ready checklist.
`;
}

export function renderComparison(comparison) {
  const sign = comparison.delta.score > 0 ? "+" : "";
  const fixedRows = comparison.fixed.length
    ? comparison.fixed.map((item) => `| ${escapePipe(item.ruleId)} | ${escapePipe(item.file)} | +${item.points || 0} | ${escapePipe(item.message)} |`).join("\n")
    : "| none |  | 0 | No findings fixed. |";
  const introducedRows = comparison.introduced.length
    ? comparison.introduced.map((item) => `| ${escapePipe(item.ruleId)} | ${escapePipe(item.file)} | -${item.points || 0} | ${escapePipe(item.message)} |`).join("\n")
    : "| none |  | 0 | No new findings. |";

  return `# Agent Ready Comparison

- Repository: ${comparison.after.name}
- Score: ${comparison.before.score}/100 (${comparison.before.grade}) -> ${comparison.after.score}/100 (${comparison.after.grade}) (${sign}${comparison.delta.score})
- Status: ${comparison.delta.status}
- Fixed findings: ${comparison.delta.fixedFindings}
- New findings: ${comparison.delta.introducedFindings}
- Remaining findings: ${comparison.delta.remainingFindings}

## Fixed Findings
| Rule | File | Impact | Message |
| --- | --- | ---: | --- |
${fixedRows}

## New Findings
| Rule | File | Impact | Message |
| --- | --- | ---: | --- |
${introducedRows}
`;
}

export function renderAgentMatrix(matrix) {
  const rows = matrix.entries.map((entry) => {
    const files = entry.files.length ? entry.files.map((file) => `\`${file}\``).join(", ") : entry.expectedFiles.map((file) => `\`${file}\``).join(", ");
    return `| ${escapePipe(entry.agent)} | ${entry.status} | ${entry.mode} | ${files} | ${escapePipe(entry.nextAction)} |`;
  }).join("\n");
  const canonical = matrix.summary.canonicalSource ? `\`${matrix.summary.canonicalSource}\`` : "not found";

  return `# Agent Compatibility Matrix

- Repository: ${matrix.repository.name}
- Ready agents: ${matrix.summary.ready}/${matrix.summary.total}
- Canonical source: ${canonical}

| Agent | Status | Mode | Files | Next action |
| --- | --- | --- | --- | --- |
${rows}
`;
}

export function renderShareComment(comment) {
  const matrixRows = comment.matrix.map((entry) => {
    const files = entry.files.length ? entry.files.map((file) => `\`${file}\``).join(", ") : "missing";
    return `| ${escapePipe(entry.agent)} | ${entry.status} | ${entry.mode} | ${files} |`;
  }).join("\n");
  const fixRows = comment.topFixes.length
    ? comment.topFixes.map((item) => `| +${item.points} | ${escapePipe(item.ruleId)} | ${item.severity} | ${escapePipe(item.file)} | ${escapePipe(item.fixSuggestion)} |`).join("\n")
    : "| 0 | none | ok |  | No fixes needed. |";
  const commands = comment.commands.length
    ? comment.commands.map((item) => `- ${item.name}: \`${item.command}\``).join("\n")
    : "- No standard commands detected yet.";
  const potentialLine = comment.summary.potentialGain
    ? `Potential score after top fixes: ${comment.summary.potentialScore}/100 (+${comment.summary.potentialGain})`
    : "No readiness fixes are currently needed.";

  return `## Agent Ready

**Score:** ${comment.summary.score}/100 (${comment.summary.grade})  
**Status:** ${comment.summary.status}  
**Agent compatibility:** ${comment.summary.compatibilityReady}/${comment.summary.compatibilityTotal} ready

${potentialLine}

### Compatibility
| Agent | Status | Mode | Files |
| --- | --- | --- | --- |
${matrixRows}

### Top Fixes
| Impact | Rule | Severity | File | Fix |
| ---: | --- | --- | --- | --- |
${fixRows}

### Verification Commands
${commands}

Generated by \`agent-ready comment\`.
`;
}

export function renderImprovement(improvement) {
  const sign = improvement.score.delta > 0 ? "+" : "";
  const delta = improvement.score.estimated ? `estimated ${sign}${improvement.score.delta}` : `${sign}${improvement.score.delta}`;
  const presetLine = improvement.preset ? `- Preset: ${escapePipe(improvement.preset)}\n` : "";
  const changes = improvement.ci
    ? [...improvement.artifacts, { ...improvement.ci, target: "ci" }]
    : improvement.artifacts;
  const changeRows = changes.length
    ? changes.map((item) => `| ${item.action} | ${escapePipe(item.file)} | ${escapePipe(item.target)} |`).join("\n")
    : "| none |  |  |";
  const remainingRows = improvement.findings.remaining.length
    ? improvement.findings.remaining.map((item) => `| ${item.severity} | ${escapePipe(item.ruleId)} | ${escapePipe(item.file)} | ${escapePipe(item.fixSuggestion)} |`).join("\n")
    : "| ok | none |  | No remaining readiness fixes. |";

  return `# Agent Ready Improvement

- Repository: ${improvement.repository.name}
- Mode: ${improvement.mode}
${presetLine}- Level: ${improvement.level}
- Score: ${improvement.score.before}/100 (${improvement.score.beforeGrade}) -> ${improvement.score.after}/100 (${improvement.score.afterGrade}) (${delta})
- Findings: ${improvement.findings.before} -> ${improvement.findings.after}

## Changes
| Action | File | Target |
| --- | --- | --- |
${changeRows}

## Remaining Findings
| Severity | Rule | File | Next action |
| --- | --- | --- | --- |
${remainingRows}
`;
}

export function renderImprovementIssue(improvement) {
  const sign = improvement.score.delta > 0 ? "+" : "";
  const delta = improvement.score.estimated ? `estimated ${sign}${improvement.score.delta}` : `${sign}${improvement.score.delta}`;
  const presetLine = improvement.preset ? `- Preset: ${escapeChecklistText(improvement.preset)}\n` : "";
  const changes = improvement.ci
    ? [...improvement.artifacts, { ...improvement.ci, target: "ci" }]
    : improvement.artifacts;
  const changeTasks = changes
    .filter((item) => item.action !== "skipped")
    .map((item) => `- [ ] ${taskVerb(item.action)} \`${item.file}\`${item.target ? ` (${item.target})` : ""}`);
  const skipped = changes.filter((item) => item.action === "skipped");
  const skippedLine = skipped.length ? `\nSkipped existing files: ${skipped.map((item) => `\`${item.file}\``).join(", ")}\n` : "";
  const remainingTasks = improvement.findings.remaining.length
    ? improvement.findings.remaining.map((item) => `- [ ] ${escapeChecklistText(item.fixSuggestion)} (${item.ruleId}, \`${item.file}\`)`)
    : ["- [x] No remaining readiness findings."];
  const changeBlock = changeTasks.length
    ? changeTasks.join("\n")
    : "- [x] No file changes needed for the selected improvement level.";

  return `# Improve agent readiness for ${improvement.repository.name}

## Score

- Current: ${improvement.score.before}/100 (${improvement.score.beforeGrade})
- Target: ${improvement.score.after}/100 (${improvement.score.afterGrade}) (${delta})
- Findings: ${improvement.findings.before} -> ${improvement.findings.after}
- Mode: ${improvement.mode}
${presetLine}- Level: ${improvement.level}
${skippedLine}
## Planned Work

${changeBlock}

## Remaining Follow-Ups

${remainingTasks.join("\n")}

## Verification

- [ ] Run \`agent-ready doctor\`
- [ ] Run \`agent-ready score --fail-under 80\`
- [ ] Run the repository test command before merging

Generated by \`agent-ready improve --format issue\`.
`;
}

export function renderMarkdownReport(profile, findings, score) {
  const commandRows = Object.entries(profile.commands)
    .filter(([, value]) => value)
    .map(([name, value]) => `| ${name} | \`${value}\` |`)
    .join("\n") || "| none |  |";
  const findingRows = findings.length
    ? findings.map((item) => `| ${item.severity} | ${item.ruleId} | ${escapePipe(item.message)} | ${item.file} | ${escapePipe(item.fixSuggestion)} |`).join("\n")
    : "| ok | none | No findings. |  |  |";

  return `# Agent Readiness Report

## Summary
- Repository: ${profile.name}
- Root: \`${profile.root}\`
- Score: ${score.score}/100 (${score.grade})
- Primary language: ${profile.primaryLanguage}
- Frameworks: ${profile.frameworks.join(", ") || "none"}
- Monorepo: ${formatMonorepo(profile.monorepo)}
- Package manager: ${profile.packageManager}

${score.summary}

## Commands
| Kind | Command |
| --- | --- |
${commandRows}

## Agent Docs
${profile.agentDocs.length ? profile.agentDocs.map((doc) => `- ${doc.target}: \`${doc.file}\``).join("\n") : "- None detected"}

## Findings
| Severity | Rule | Message | File | Fix |
| --- | --- | --- | --- | --- |
${findingRows}
`;
}

export function renderSnapshot(snapshot) {
  const profile = snapshot.profile;
  const score = snapshot.score;
  const findingRows = snapshot.findings.length
    ? snapshot.findings.slice(0, 10).map((item) => `| ${item.severity} | ${escapePipe(item.ruleId)} | ${escapePipe(item.file)} | ${escapePipe(item.fixSuggestion)} |`).join("\n")
    : "| ok | none |  | No readiness findings. |";
  const commandRows = Object.entries(profile.commands)
    .filter(([, value]) => value)
    .map(([name, value]) => `| ${name} | \`${value}\` |`)
    .join("\n") || "| none |  |";
  const matrixRows = snapshot.matrix.entries
    .map((entry) => {
      const files = entry.files.length ? entry.files.map((file) => `\`${file}\``).join(", ") : "missing";
      return `| ${escapePipe(entry.agent)} | ${entry.status} | ${entry.mode} | ${files} |`;
    }).join("\n");

  return `# Agent Readiness Snapshot

- Repository: ${snapshot.repository.name}
- Generated: ${snapshot.generatedAt}
- Score: ${score.score}/100 (${score.grade})
- Agent compatibility: ${snapshot.summary.agentCompatibilityReady}/${snapshot.summary.agentCompatibilityTotal}
- Findings: ${snapshot.summary.findings} (${snapshot.summary.errors} errors, ${snapshot.summary.warnings} warnings, ${snapshot.summary.notices} notices)
- Primary language: ${profile.primaryLanguage}
- Package manager: ${profile.packageManager}
- Monorepo: ${formatMonorepo(profile.monorepo)}

${score.summary}

## Commands
| Kind | Command |
| --- | --- |
${commandRows}

## Agent Compatibility
| Agent | Status | Mode | Files |
| --- | --- | --- | --- |
${matrixRows}

## Top Findings
| Severity | Rule | File | Suggested fix |
| --- | --- | --- | --- |
${findingRows}

## Next Actions

- Run \`agent-ready improve --preset team --dry-run --format issue\` to create a cleanup checklist.
- Run \`agent-ready ci --write\` to add a reusable readiness gate.
- Re-run \`agent-ready snapshot --write --force\` after meaningful repository changes.

Generated by \`agent-ready snapshot\`.
`;
}

function escapePipe(value) {
  return String(value).replace(/\|/g, "\\|");
}

function escapeChecklistText(value) {
  return String(value).replace(/\n/g, " ").trim();
}

function taskVerb(action) {
  if (action === "planned") return "Add";
  if (action === "created") return "Review created";
  if (action === "written") return "Review written";
  if (action === "overwritten") return "Review overwritten";
  return "Review";
}

function annotationLevel(severity) {
  if (severity === "error") return "error";
  if (severity === "info") return "notice";
  return "warning";
}

function escapeAnnotationMessage(value) {
  return String(value)
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
}

function escapeAnnotationProperty(value) {
  return escapeAnnotationMessage(value)
    .replace(/:/g, "%3A")
    .replace(/,/g, "%2C");
}

function formatMonorepo(monorepo) {
  if (!monorepo?.detected) return "none";
  const tools = monorepo.tools.length ? monorepo.tools.join(", ") : "workspaces";
  const workspaces = monorepo.workspaces.length ? ` (${monorepo.workspaces.join(", ")})` : "";
  return `${tools}${workspaces}`;
}

function badgeColor(score) {
  if (score >= 90) return "brightgreen";
  if (score >= 75) return "green";
  if (score >= 60) return "yellow";
  if (score >= 40) return "orange";
  return "red";
}

function buildRoadmapPhases(findings) {
  const phases = [
    {
      name: "Phase 1: Establish Agent Handoff",
      description: "Create the minimum shared contract every coding agent should read before editing.",
      rules: ["missing-agents-md", "missing-readme"],
    },
    {
      name: "Phase 2: Make Verification Trustworthy",
      description: "Ensure agents can run checks and trust CI before handing off changes.",
      rules: ["missing-test-command", "invalid-package-script", "missing-ci", "missing-lint-command"],
    },
    {
      name: "Phase 3: Reduce Instruction Drift",
      description: "Keep agent guidance compact, current, and safe across tools.",
      rules: ["missing-safety-section", "missing-verification-section", "stale-path-reference", "drift-prone-agent-doc", "agent-doc-too-long"],
    },
  ];
  return phases.map((phase) => ({
    ...phase,
    items: findings.filter((finding) => phase.rules.includes(finding.ruleId)),
  }));
}

function roadmapAction(ruleId) {
  const actions = {
    "missing-agents-md": "Add canonical `AGENTS.md` instructions",
    "missing-readme": "Add or refresh README basics",
    "missing-test-command": "Document a reliable test command",
    "invalid-package-script": "Fix package scripts referenced by detected commands",
    "missing-ci": "Add a CI workflow agents can trust",
    "missing-lint-command": "Document or add a lint command",
    "missing-safety-section": "Add safety boundaries to agent instructions",
    "missing-verification-section": "Add verification guidance to agent instructions",
    "stale-path-reference": "Remove stale path references from agent docs",
    "drift-prone-agent-doc": "Replace duplicated agent docs with canonical shims",
    "agent-doc-too-long": "Shorten long agent docs and link out to details",
  };
  return actions[ruleId] || `Fix ${ruleId}`;
}
