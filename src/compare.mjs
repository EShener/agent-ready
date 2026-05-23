import fs from "node:fs/promises";

export async function compareReadinessFiles(beforePath, afterPath) {
  if (!beforePath || beforePath === true) throw new Error("--before is required.");
  if (!afterPath || afterPath === true) throw new Error("--after is required.");
  const before = JSON.parse(await fs.readFile(beforePath, "utf8"));
  const after = JSON.parse(await fs.readFile(afterPath, "utf8"));
  return compareReadiness(before, after);
}

export function compareReadiness(beforePayload, afterPayload) {
  const before = normalizePayload(beforePayload, "before");
  const after = normalizePayload(afterPayload, "after");
  const beforeFindings = keyedFindings(before.findings);
  const afterFindings = keyedFindings(after.findings);

  const fixed = [...beforeFindings.entries()]
    .filter(([key]) => !afterFindings.has(key))
    .map(([, finding]) => finding);
  const introduced = [...afterFindings.entries()]
    .filter(([key]) => !beforeFindings.has(key))
    .map(([, finding]) => finding);
  const remaining = [...afterFindings.entries()]
    .filter(([key]) => beforeFindings.has(key))
    .map(([, finding]) => finding);
  const scoreDelta = after.score - before.score;

  return {
    schemaVersion: 1,
    before,
    after,
    delta: {
      score: scoreDelta,
      status: scoreDelta > 0 ? "improved" : scoreDelta < 0 ? "regressed" : "unchanged",
      gradeChanged: before.grade !== after.grade,
      fixedFindings: fixed.length,
      introducedFindings: introduced.length,
      remainingFindings: remaining.length,
    },
    fixed,
    introduced,
    remaining,
  };
}

function normalizePayload(payload, label) {
  const scoreSource = typeof payload.score === "object" && payload.score !== null ? payload.score : payload;
  const score = numberOrNull(scoreSource.score) ?? numberOrNull(scoreSource.current);
  if (score === null) throw new Error(`${label} JSON does not include a score.`);
  const findings = normalizeFindings(payload, scoreSource);

  return {
    name: payload.profile?.name || payload.repository?.name || payload.name || label,
    score,
    grade: scoreSource.grade || gradeFor(score),
    findings,
  };
}

function normalizeFindings(payload, scoreSource) {
  if (Array.isArray(payload.findings)) {
    const deductionPoints = new Map((scoreSource.deductions || []).map((item) => [item.ruleId, item.points]));
    return payload.findings.map((finding) => ({
      ruleId: finding.ruleId,
      severity: finding.severity,
      file: finding.file || "",
      message: finding.message || "",
      points: deductionPoints.get(finding.ruleId) || 0,
    }));
  }

  if (Array.isArray(payload.items)) {
    return payload.items.map((item) => ({
      ruleId: item.ruleId,
      severity: item.severity,
      file: item.file || "",
      message: item.message || "",
      points: item.points || 0,
    }));
  }

  if (Array.isArray(scoreSource.deductions)) {
    return scoreSource.deductions.map((item) => ({
      ruleId: item.ruleId,
      severity: item.severity,
      file: item.file || "",
      message: item.message || "",
      points: item.points || 0,
    }));
  }

  return [];
}

function keyedFindings(findings) {
  const map = new Map();
  for (const finding of findings) {
    map.set(`${finding.ruleId}:${finding.file}`, finding);
  }
  return map;
}

function numberOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function gradeFor(score) {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}
