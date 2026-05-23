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
