import path from "node:path";
import { pathExists, toPosix, writeText } from "./fs-utils.mjs";
import { lintRepo, scoreRepo } from "./linter.mjs";
import { buildAgentMatrix } from "./matrix.mjs";
import { scanRepo } from "./scanner.mjs";

const DEFAULT_SNAPSHOT_PATH = "AGENT_READINESS.md";

export async function snapshotRepo(root = process.cwd(), options = {}) {
  const profile = await scanRepo(root, { configPath: options.configPath });
  const findings = await lintRepo(profile);
  const score = scoreRepo(profile, findings);
  const matrix = buildAgentMatrix(profile);

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    repository: {
      name: profile.name,
      root: profile.root,
    },
    score,
    summary: {
      agentCompatibilityReady: matrix.summary.ready,
      agentCompatibilityTotal: matrix.summary.total,
      findings: findings.length,
      errors: findings.filter((finding) => finding.severity === "error").length,
      warnings: findings.filter((finding) => finding.severity === "warning").length,
      notices: findings.filter((finding) => finding.severity === "info").length,
    },
    profile,
    findings,
    matrix,
  };
}

export async function writeSnapshotFile(snapshot, content, options = {}) {
  const root = path.resolve(options.root || snapshot.repository.root || process.cwd());
  const output = options.output || DEFAULT_SNAPSHOT_PATH;
  const absoluteOutput = path.isAbsolute(output) ? output : path.join(root, output);
  const relativeOutput = toPosix(path.relative(root, absoluteOutput)) || DEFAULT_SNAPSHOT_PATH;

  if (await pathExists(absoluteOutput) && !options.force) {
    return { action: "skipped", file: relativeOutput };
  }

  if (options.dryRun) {
    return { action: "planned", file: relativeOutput };
  }

  await writeText(absoluteOutput, content);
  return { action: "written", file: relativeOutput };
}
