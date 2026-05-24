import path from "node:path";
import { lintRepo, scoreRepo } from "./linter.mjs";
import { scanRepo } from "./scanner.mjs";

export async function benchmarkRepos(targets = [], options = {}) {
  const baseRoot = path.resolve(options.root || process.cwd());
  const configPath = typeof options.configPath === "string" ? options.configPath : undefined;
  const selectedTargets = targets.length ? targets : [baseRoot];
  const repos = [];
  const allFindings = [];

  for (const target of selectedTargets) {
    const repoRoot = path.resolve(baseRoot, target);
    const profile = await scanRepo(repoRoot, { configPath });
    const findings = await lintRepo(profile);
    const score = scoreRepo(profile, findings);
    allFindings.push(...findings.map((finding) => ({ ...finding, repository: profile.name })));
    repos.push({
      name: profile.name,
      root: profile.root,
      displayPath: formatDisplayPath(profile.root, baseRoot),
      score: score.score,
      grade: score.grade,
      primaryLanguage: profile.primaryLanguage,
      frameworks: profile.frameworks,
      packageManager: profile.packageManager,
      agentDocs: profile.agentDocs.length,
      findings: findings.length,
      errors: findings.filter((finding) => finding.severity === "error").length,
      warnings: findings.filter((finding) => finding.severity === "warning").length,
      notices: findings.filter((finding) => finding.severity === "info").length,
      topFindings: findings.slice(0, 3).map((finding) => ({
        severity: finding.severity,
        ruleId: finding.ruleId,
        message: finding.message,
        file: finding.file,
        fixSuggestion: finding.fixSuggestion,
      })),
    });
  }

  repos.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    count: repos.length,
    averageScore: averageScore(repos),
    readyCount: repos.filter((repo) => repo.score >= 90).length,
    needsWorkCount: repos.filter((repo) => repo.score < 75).length,
    commonFindings: summarizeFindings(allFindings),
    repos,
  };
}

function averageScore(repos) {
  if (!repos.length) return 0;
  return Math.round(repos.reduce((sum, repo) => sum + repo.score, 0) / repos.length);
}

function formatDisplayPath(repoRoot, baseRoot) {
  const relative = path.relative(baseRoot, repoRoot);
  if (!relative) return ".";
  return relative.startsWith("..") ? repoRoot : relative.split(path.sep).join("/");
}

function summarizeFindings(findings) {
  const counts = new Map();
  for (const finding of findings) {
    const current = counts.get(finding.ruleId) || {
      ruleId: finding.ruleId,
      severity: finding.severity,
      count: 0,
      fixSuggestion: finding.fixSuggestion,
      repositories: new Set(),
    };
    current.count += 1;
    current.repositories.add(finding.repository);
    counts.set(finding.ruleId, current);
  }
  return [...counts.values()]
    .map((item) => ({ ...item, repositories: [...item.repositories].sort() }))
    .sort((a, b) => b.count - a.count || a.ruleId.localeCompare(b.ruleId))
    .slice(0, 10);
}
