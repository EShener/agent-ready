import { scanRepo } from "./scanner.mjs";
import { writeGeneratedArtifacts } from "./generator.mjs";
import { lintRepo, scoreRepo } from "./linter.mjs";
import { writeCiWorkflow } from "./workflow.mjs";

export async function improveRepo(options = {}) {
  const root = options.root || process.cwd();
  const scanOptions = { configPath: options.configPath };
  const beforeProfile = await scanRepo(root, scanOptions);
  const beforeFindings = await lintRepo(beforeProfile);
  const beforeScore = scoreRepo(beforeProfile, beforeFindings);

  const artifacts = await writeGeneratedArtifacts(beforeProfile, {
    targets: options.targets,
    level: options.level || "basic",
    dryRun: Boolean(options.dryRun),
    force: Boolean(options.force),
  });

  let ci = null;
  if (!options.noCi) {
    ci = await writeCiWorkflow({
      root,
      failUnder: options.failUnder ?? "80",
      mode: options.mode || "action",
      comment: Boolean(options.comment),
      dryRun: Boolean(options.dryRun),
      force: Boolean(options.force),
    });
  }

  const afterProfile = options.dryRun ? beforeProfile : await scanRepo(root, scanOptions);
  const afterFindings = options.dryRun ? estimateFindingsAfterPlan(beforeFindings, artifacts, ci) : await lintRepo(afterProfile);
  const afterScore = scoreRepo(afterProfile, afterFindings);

  return {
    schemaVersion: 1,
    repository: {
      name: beforeProfile.name,
      root: beforeProfile.root,
    },
    preset: options.preset || null,
    mode: options.dryRun ? "dry-run" : "applied",
    level: options.level || "basic",
    score: {
      before: beforeScore.score,
      beforeGrade: beforeScore.grade,
      after: afterScore.score,
      afterGrade: afterScore.grade,
      delta: afterScore.score - beforeScore.score,
      estimated: Boolean(options.dryRun),
    },
    findings: {
      before: beforeFindings.length,
      after: afterFindings.length,
      remaining: afterFindings.slice(0, 5).map((finding) => ({
        severity: finding.severity,
        ruleId: finding.ruleId,
        file: finding.file,
        message: finding.message,
        fixSuggestion: finding.fixSuggestion,
      })),
    },
    artifacts: artifacts.map((artifact) => ({
      target: artifact.target,
      file: artifact.file,
      action: artifact.action,
    })),
    ci,
  };
}

function estimateFindingsAfterPlan(findings, artifacts, ci) {
  const plannedFiles = new Set(
    artifacts
      .filter((artifact) => changesFile(artifact.action))
      .map((artifact) => artifact.file),
  );
  const plannedCi = ci && changesFile(ci.action);

  return findings.filter((finding) => {
    if (finding.ruleId === "missing-agents-md") return !plannedFiles.has("AGENTS.md");
    if (finding.ruleId === "missing-ci") return !plannedCi;
    if (
      finding.ruleId === "missing-safety-section"
      || finding.ruleId === "missing-verification-section"
      || finding.ruleId === "stale-path-reference"
      || finding.ruleId === "drift-prone-agent-doc"
      || finding.ruleId === "agent-doc-too-long"
    ) {
      return !plannedFiles.has(finding.file);
    }
    return true;
  });
}

function changesFile(action) {
  return ["planned", "created", "written", "overwritten"].includes(action);
}
