import path from "node:path";
import { pathExists, readJsonIfExists, readTextIfExists } from "./fs-utils.mjs";

const AGENT_DOCS = [
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  ".github/copilot-instructions.md",
];

export async function lintRepo(profile) {
  const findings = [];

  if (!profile.agentDocs.some((doc) => doc.file === "AGENTS.md")) {
    findings.push(finding("warning", "missing-agents-md", "Missing AGENTS.md canonical agent instructions.", "AGENTS.md", "Run `agent-ready init --targets codex`."));
  }
  if (!profile.commands.test) {
    findings.push(finding("warning", "missing-test-command", "No test command was detected.", "package.json", "Add a test script or configure the test command in agent-ready.json."));
  }
  if (!profile.commands.lint) {
    findings.push(finding("info", "missing-lint-command", "No lint command was detected.", "package.json", "Add a lint script if the project has automated style checks."));
  }
  if (!profile.docs.readme) {
    findings.push(finding("warning", "missing-readme", "README.md is missing.", "README.md", "Add a README with install, usage, and contribution basics."));
  }
  if (!profile.ci.githubActions.length) {
    findings.push(finding("info", "missing-ci", "No GitHub Actions workflow was detected.", ".github/workflows", "Add CI so agents can trust the verification path."));
  }

  findings.push(...await validatePackageScripts(profile));
  findings.push(...await validateAgentDocs(profile));

  return findings.sort(compareFindings);
}

export function scoreRepo(profile, findings) {
  const weights = {
    "missing-agents-md": 25,
    "missing-test-command": 15,
    "missing-readme": 8,
    "missing-ci": 8,
    "missing-safety-section": 10,
    "missing-verification-section": 8,
    "invalid-package-script": 12,
    "stale-path-reference": 8,
    "drift-prone-agent-doc": 5,
    "agent-doc-too-long": 4,
    "missing-lint-command": 4,
  };

  const deductions = findings.map((item) => ({
    ruleId: item.ruleId,
    severity: item.severity,
    points: weights[item.ruleId] || (item.severity === "error" ? 10 : item.severity === "warning" ? 5 : 2),
    message: item.message,
  }));
  const score = Math.max(0, 100 - deductions.reduce((sum, item) => sum + item.points, 0));

  return {
    score,
    grade: score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F",
    deductions,
    summary: summarizeScore(profile, score, deductions),
  };
}

async function validatePackageScripts(profile) {
  const findings = [];
  const packageJson = await readJsonIfExists(path.join(profile.root, "package.json"));
  if (!packageJson) return findings;
  const scripts = packageJson.scripts || {};

  for (const [kind, command] of Object.entries(profile.commands)) {
    const script = packageScriptName(command);
    if (!script) continue;
    if (!scripts[script]) {
      findings.push(finding("error", "invalid-package-script", `Detected ${kind} command references missing package script "${script}".`, "package.json", `Add scripts.${script} or update the ${kind} command.`));
    }
  }

  return findings;
}

async function validateAgentDocs(profile) {
  const findings = [];
  const docs = [];
  for (const file of AGENT_DOCS) {
    const absolute = path.join(profile.root, file);
    const text = await readTextIfExists(absolute);
    if (text) docs.push({ file, text });
  }

  const cursorRuleDir = path.join(profile.root, ".cursor", "rules");
  for (const doc of profile.agentDocs.filter((item) => item.target === "cursor")) {
    if (!docs.some((item) => item.file === doc.file)) {
      const text = await readTextIfExists(path.join(profile.root, doc.file));
      if (text) docs.push({ file: doc.file, text, cursorRuleDir });
    }
  }

  for (const doc of docs) {
    const referencesCanonical = doc.file !== "AGENTS.md" && /AGENTS\.md/i.test(doc.text);
    if (doc.text.length > 8000) {
      findings.push(finding("info", "agent-doc-too-long", `${doc.file} is over 8000 characters and may waste agent context.`, doc.file, "Move detailed docs into linked files and keep agent instructions compact."));
    }
    if (!referencesCanonical && !/(safety|permission|danger|destructive|secret|credential|do not|never|不要|禁止)/i.test(doc.text)) {
      findings.push(finding("warning", "missing-safety-section", `${doc.file} does not include safety boundaries.`, doc.file, "Add a short safety section covering destructive commands and secrets."));
    }
    if (!referencesCanonical && !/(verification|test|lint|build|verify|检查|测试)/i.test(doc.text)) {
      findings.push(finding("warning", "missing-verification-section", `${doc.file} does not explain verification.`, doc.file, "Add the expected test, lint, or build commands."));
    }
    findings.push(...await findStalePathReferences(profile.root, doc.file, doc.text));
  }

  const canonical = docs.find((doc) => doc.file === "AGENTS.md");
  if (canonical) {
    for (const doc of docs.filter((item) => item.file !== "AGENTS.md")) {
      const referencesCanonical = /AGENTS\.md/i.test(doc.text);
      if (!referencesCanonical && doc.text.length > 500) {
        findings.push(finding("info", "drift-prone-agent-doc", `${doc.file} duplicates agent guidance without referencing AGENTS.md.`, doc.file, "Replace most content with a short pointer to AGENTS.md."));
      }
    }
  }

  return findings;
}

async function findStalePathReferences(root, file, text) {
  const findings = [];
  const candidates = extractBacktickPaths(text);
  for (const candidate of candidates) {
    if (candidate === file) continue;
    const absolute = path.join(root, candidate);
    if (!await pathExists(absolute)) {
      findings.push(finding("warning", "stale-path-reference", `${file} references missing path "${candidate}".`, file, "Update or remove the stale path reference."));
    }
  }
  return findings;
}

function extractBacktickPaths(text) {
  const matches = [...text.matchAll(/`([^`\n]+)`/g)].map((match) => match[1].trim());
  return [...new Set(matches.filter((value) => {
    if (!value || value.includes(" ")) return false;
    if (/^(https?:|npm|pnpm|yarn|bun|node|python|python3|cargo|go|git|npx)\b/.test(value)) return false;
    if (/^[A-Z_]+$/.test(value)) return false;
    return /[/.]/.test(value);
  }))];
}

function packageScriptName(command) {
  const match = command.match(/^(?:npm run|pnpm|yarn|bun run)\s+([A-Za-z0-9:_-]+)$/);
  return match?.[1] || "";
}

function finding(severity, ruleId, message, file, fixSuggestion) {
  return { severity, ruleId, message, file, fixSuggestion };
}

function compareFindings(a, b) {
  const rank = { error: 0, warning: 1, info: 2 };
  return rank[a.severity] - rank[b.severity] || a.ruleId.localeCompare(b.ruleId) || a.file.localeCompare(b.file);
}

function summarizeScore(profile, score, deductions) {
  if (score >= 90) return `${profile.name} is agent-ready. Keep instructions compact as the repo evolves.`;
  if (score >= 75) return `${profile.name} is close. Fix the top deductions to make agent handoffs more reliable.`;
  if (score >= 60) return `${profile.name} is usable but needs clearer commands and verification guidance.`;
  return `${profile.name} needs canonical agent instructions before AI coding agents can work reliably.`;
}
