export function buildShareComment(profile, findings, score, matrix, explanation, options = {}) {
  const maxFixes = normalizeMaxFixes(options.maxFixes ?? 3);
  const topFixes = explanation.items.slice(0, maxFixes).map((item) => ({
    ruleId: item.ruleId,
    severity: item.severity,
    file: item.file,
    points: item.points,
    why: item.why,
    fixSuggestion: item.fixSuggestion,
  }));

  return {
    schemaVersion: 1,
    repository: {
      name: profile.name,
      root: profile.root,
      primaryLanguage: profile.primaryLanguage,
      frameworks: profile.frameworks,
    },
    summary: {
      score: score.score,
      grade: score.grade,
      status: findings.length ? "needs-work" : "ready",
      findingCount: findings.length,
      compatibilityReady: matrix.summary.ready,
      compatibilityTotal: matrix.summary.total,
      potentialGain: explanation.score.potentialGain,
      potentialScore: explanation.score.potentialScore,
    },
    matrix: matrix.entries.map((entry) => ({
      target: entry.target,
      agent: entry.agent,
      status: entry.status,
      mode: entry.mode,
      files: entry.files,
    })),
    topFixes,
    commands: Object.entries(profile.commands)
      .filter(([, value]) => value)
      .map(([name, command]) => ({ name, command })),
  };
}

function normalizeMaxFixes(value) {
  const maxFixes = Number(value);
  if (!Number.isFinite(maxFixes) || maxFixes < 0 || maxFixes > 20) {
    throw new Error("--max-fixes must be a number between 0 and 20.");
  }
  return Math.trunc(maxFixes);
}
