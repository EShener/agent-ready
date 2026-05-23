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

function escapePipe(value) {
  return String(value).replace(/\|/g, "\\|");
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
