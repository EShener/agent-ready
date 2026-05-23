export function explainRepo(profile, findings, score) {
  const items = findings.map((finding, index) => {
    const deduction = score.deductions[index] || {};
    const points = deduction.points || fallbackPoints(finding.severity);
    return {
      ruleId: finding.ruleId,
      severity: finding.severity,
      file: finding.file,
      message: finding.message,
      points,
      fixSuggestion: finding.fixSuggestion,
      why: whyForRule(finding.ruleId),
    };
  }).sort((a, b) => b.points - a.points || severityRank(a.severity) - severityRank(b.severity) || a.ruleId.localeCompare(b.ruleId));

  const recoverablePoints = items.reduce((sum, item) => sum + item.points, 0);
  const potentialGain = Math.min(100 - score.score, recoverablePoints);

  return {
    schemaVersion: 1,
    repository: {
      name: profile.name,
      root: profile.root,
      primaryLanguage: profile.primaryLanguage,
    },
    score: {
      current: score.score,
      grade: score.grade,
      summary: score.summary,
      recoverablePoints,
      potentialGain,
      potentialScore: Math.min(100, score.score + recoverablePoints),
    },
    items,
  };
}

function whyForRule(ruleId) {
  const reasons = {
    "missing-agents-md": "AI coding agents need one canonical handoff file before editing safely.",
    "missing-test-command": "Agents need a trusted verification command to know whether a change worked.",
    "missing-lint-command": "Style and static checks catch low-level mistakes before review.",
    "missing-readme": "A README gives agents and contributors the first source of project context.",
    "missing-ci": "CI gives agents a remote verification path that is independent of a local machine.",
    "missing-safety-section": "Safety boundaries reduce the chance of destructive commands or secret exposure.",
    "missing-verification-section": "Verification guidance tells agents which checks to run for each change.",
    "invalid-package-script": "A broken script reference causes agents and CI to run commands that cannot succeed.",
    "stale-path-reference": "Stale file references waste agent context and send changes to the wrong place.",
    "drift-prone-agent-doc": "Duplicated agent docs tend to drift unless they point back to one canonical file.",
    "agent-doc-too-long": "Very long agent docs consume context and hide the instructions that matter most.",
  };
  return reasons[ruleId] || "This finding makes agent handoffs less reliable.";
}

function fallbackPoints(severity) {
  if (severity === "error") return 10;
  if (severity === "warning") return 5;
  return 2;
}

function severityRank(severity) {
  if (severity === "error") return 0;
  if (severity === "warning") return 1;
  return 2;
}
