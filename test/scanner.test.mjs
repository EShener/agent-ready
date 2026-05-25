import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { benchmarkRepos } from "../src/benchmark.mjs";
import { buildShareComment } from "../src/comment.mjs";
import { compareReadiness } from "../src/compare.mjs";
import { explainRepo } from "../src/explainer.mjs";
import { buildAgentsMd, planGeneratedArtifacts } from "../src/generator.mjs";
import { improveRepo } from "../src/improver.mjs";
import { lintRepo, scoreRepo } from "../src/linter.mjs";
import { buildAgentMatrix } from "../src/matrix.mjs";
import { renderAgentMatrix, renderAnnotations, renderBenchmarkReport, renderComparison, renderDoctor, renderExplanation, renderImprovement, renderImprovementIssue, renderLeaderboard, renderMarkdownReport, renderRoadmap, renderShareComment } from "../src/reporter.mjs";
import { scanRepo } from "../src/scanner.mjs";
import { snapshotRepo } from "../src/snapshot.mjs";
import { renderCiWorkflow, writeCiWorkflow } from "../src/workflow.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => path.join(__dirname, "fixtures", name);

test("scan detects a Node app profile", async () => {
  const profile = await scanRepo(fixture("node-app"));

  assert.equal(profile.name, "fixture-node-app");
  assert.equal(profile.packageManager, "npm");
  assert.equal(profile.primaryLanguage, "TypeScript");
  assert.deepEqual(profile.frameworks.sort(), ["React", "Vite", "Vitest"].sort());
  assert.equal(profile.commands.install, "npm install");
  assert.equal(profile.commands.test, "npm run test");
  assert.equal(profile.commands.lint, "npm run lint");
  assert.equal(profile.docs.readme, true);
  assert.deepEqual(profile.ci.githubActions, [".github/workflows/ci.yml"]);
});

test("scan detects Python, Rust, and Go repositories", async () => {
  const python = await scanRepo(fixture("python-app"));
  const rust = await scanRepo(fixture("rust-app"));
  const go = await scanRepo(fixture("go-app"));

  assert.equal(python.primaryLanguage, "Python");
  assert.equal(python.commands.test, "python3 -m pytest");
  assert.ok(python.frameworks.includes("FastAPI"));

  assert.equal(rust.primaryLanguage, "Rust");
  assert.equal(rust.commands.test, "cargo test");

  assert.equal(go.primaryLanguage, "Go");
  assert.equal(go.commands.test, "go test ./...");
});

test("scan detects monorepo workspace signals", async () => {
  const profile = await scanRepo(fixture("monorepo"));

  assert.equal(profile.name, "fixture-monorepo");
  assert.equal(profile.monorepo.detected, true);
  assert.ok(profile.monorepo.tools.includes("package workspaces"));
  assert.ok(profile.monorepo.tools.includes("pnpm workspaces"));
  assert.ok(profile.monorepo.tools.includes("Turborepo"));
  assert.deepEqual(profile.monorepo.workspaces, ["apps/*", "packages/*"]);
  assert.equal(profile.packageManager, "pnpm");
  assert.equal(profile.commands.test, "pnpm test");
});

test("scan detects frontend test and component tooling", async () => {
  const profile = await scanRepo(fixture("frontend-tooling"));

  assert.equal(profile.name, "fixture-frontend-tooling");
  assert.ok(profile.frameworks.includes("Playwright"));
  assert.ok(profile.frameworks.includes("Storybook"));
  assert.equal(profile.commands.test, "npm run test");
});

test("generator plans canonical and shim files without writing", async () => {
  const profile = await scanRepo(fixture("node-app"));
  const artifacts = await planGeneratedArtifacts(profile, { targets: ["codex", "cursor"] });

  assert.deepEqual(artifacts.map((item) => item.file), ["AGENTS.md", ".cursor/rules/agent-ready.mdc"]);
  assert.match(artifacts[0].content, /Project Overview/);
  assert.match(artifacts[1].content, /Use AGENTS\.md/);
});

test("generator plans staged readiness artifacts by fix level", async () => {
  const profile = await scanRepo(fixture("node-app"));
  const team = await planGeneratedArtifacts(profile, { targets: ["codex"], level: "team" });
  const full = await planGeneratedArtifacts(profile, { targets: ["codex"], level: "full" });

  assert.ok(team.some((item) => item.file === ".github/pull_request_template.md"));
  assert.ok(team.some((item) => item.file === "docs/architecture.md"));
  assert.equal(team.some((item) => item.file === ".env.example"), false);
  assert.ok(full.some((item) => item.file === ".env.example"));
  assert.ok(full.some((item) => item.file === ".github/ISSUE_TEMPLATE/agent-readiness.md"));
  assert.match(full.find((item) => item.file === "docs/architecture.md").content, /fixture-node-app/);
  assert.doesNotMatch(full.find((item) => item.file === "docs/architecture.md").content, /Document the main execution path/);
});

test("AGENTS.md includes detected commands and safety boundaries", async () => {
  const profile = await scanRepo(fixture("node-app"));
  const content = buildAgentsMd(profile);

  assert.match(content, /test: `npm run test`/);
  assert.match(content, /Safety Boundaries/);
  assert.match(content, /Verification/);
});

test("AGENTS.md includes monorepo details when detected", async () => {
  const profile = await scanRepo(fixture("monorepo"));
  const content = buildAgentsMd(profile);

  assert.match(content, /Monorepo:/);
  assert.match(content, /Turborepo/);
  assert.match(content, /apps\/\*/);
});

test("lint detects missing agent docs and stale references", async () => {
  const profile = await scanRepo(fixture("bad-agent-docs"));
  const findings = await lintRepo(profile);

  assert.ok(findings.some((finding) => finding.ruleId === "missing-agents-md"));
  assert.ok(findings.some((finding) => finding.ruleId === "stale-path-reference"));
});

test("score is explainable and bounded", async () => {
  const profile = await scanRepo(fixture("empty-repo"));
  const findings = await lintRepo(profile);
  const score = scoreRepo(profile, findings);

  assert.equal(typeof score.score, "number");
  assert.ok(score.score >= 0);
  assert.ok(score.score <= 100);
  assert.ok(score.deductions.length > 0);
});

test("markdown report includes commands, docs, and findings", async () => {
  const profile = await scanRepo(fixture("node-app"));
  const findings = await lintRepo(profile);
  const score = scoreRepo(profile, findings);
  const report = renderMarkdownReport(profile, findings, score);

  assert.match(report, /Agent Readiness Report/);
  assert.match(report, /fixture-node-app/);
  assert.match(report, /npm run test/);
});

test("snapshot summarizes score, compatibility, and findings", async () => {
  const snapshot = await snapshotRepo(fixture("node-app"));

  assert.equal(snapshot.repository.name, "fixture-node-app");
  assert.equal(snapshot.matrix.summary.total, 5);
  assert.equal(typeof snapshot.score.score, "number");
  assert.equal(snapshot.summary.findings, snapshot.findings.length);
});

test("explanation report ranks fixes by score impact", async () => {
  const profile = await scanRepo(fixture("empty-repo"));
  const findings = await lintRepo(profile);
  const score = scoreRepo(profile, findings);
  const explanation = explainRepo(profile, findings, score);
  const report = renderExplanation(explanation);

  assert.equal(explanation.items[0].ruleId, "missing-agents-md");
  assert.equal(explanation.items[0].points, 25);
  assert.match(report, /Agent Ready Fix Plan/);
  assert.match(report, /AI coding agents need one canonical handoff file/);
});

test("comparison report summarizes score changes and fixed findings", () => {
  const comparison = compareReadiness(
    {
      profile: { name: "demo" },
      findings: [{ severity: "warning", ruleId: "missing-agents-md", file: "AGENTS.md", message: "Missing AGENTS.md canonical agent instructions." }],
      score: { score: 75, grade: "B", deductions: [{ ruleId: "missing-agents-md", severity: "warning", points: 25 }] },
    },
    {
      profile: { name: "demo" },
      findings: [],
      score: { score: 100, grade: "A", deductions: [] },
    },
  );
  const report = renderComparison(comparison);

  assert.equal(comparison.delta.score, 25);
  assert.equal(comparison.delta.fixedFindings, 1);
  assert.match(report, /Agent Ready Comparison/);
  assert.match(report, /Status: improved/);
});

test("improver plans safe changes and renders before/after reports", async () => {
  const temp = await fs.mkdtemp(path.join("/tmp", "agent-ready-improver-"));
  await fs.writeFile(path.join(temp, "package.json"), JSON.stringify({ name: "improver-demo", scripts: { test: "node --test" } }), "utf8");

  const dryRun = await improveRepo({ root: temp, targets: ["codex"], dryRun: true, noCi: true });
  const dryRunMarkdown = renderImprovement(dryRun);
  const dryRunIssue = renderImprovementIssue(dryRun);

  assert.equal(dryRun.mode, "dry-run");
  assert.equal(dryRun.score.estimated, true);
  assert.ok(dryRun.score.delta > 0);
  assert.deepEqual(dryRun.artifacts.map((item) => item.action), ["planned"]);
  assert.match(dryRunMarkdown, /Agent Ready Improvement/);
  assert.match(dryRunMarkdown, /estimated \+\d+/);
  assert.match(dryRunMarkdown, /\| planned \| AGENTS\.md \| codex \|/);
  assert.match(dryRunIssue, /Improve agent readiness for improver-demo/);
  assert.match(dryRunIssue, /- \[ \] Add `AGENTS\.md`/);
  assert.match(dryRunIssue, /Verification/);
  await assert.rejects(fs.access(path.join(temp, "AGENTS.md")));

  const applied = await improveRepo({ root: temp, targets: ["codex"], noCi: true });

  assert.equal(applied.mode, "applied");
  assert.ok(applied.score.delta > 0);
  assert.equal(applied.artifacts[0].action, "created");
  assert.match(await fs.readFile(path.join(temp, "AGENTS.md"), "utf8"), /Verification/);
});

test("agent matrix summarizes tool compatibility", () => {
  const matrix = buildAgentMatrix({
    name: "demo",
    root: "/repo",
    agentDocs: [
      { target: "codex", file: "AGENTS.md" },
      { target: "cursor", file: ".cursor/rules/agent-ready.mdc" },
    ],
  });
  const report = renderAgentMatrix(matrix);

  assert.equal(matrix.summary.ready, 2);
  assert.equal(matrix.entries.find((entry) => entry.target === "cursor").mode, "shim");
  assert.equal(matrix.entries.find((entry) => entry.target === "claude").status, "missing");
  assert.match(report, /Agent Compatibility Matrix/);
  assert.match(report, /Ready agents: 2\/5/);
});

test("share comment summarizes score, compatibility, and top fixes", async () => {
  const profile = await scanRepo(fixture("empty-repo"));
  const findings = await lintRepo(profile);
  const score = scoreRepo(profile, findings);
  const matrix = buildAgentMatrix(profile);
  const explanation = explainRepo(profile, findings, score);
  const comment = buildShareComment(profile, findings, score, matrix, explanation, { maxFixes: 2 });
  const markdown = renderShareComment(comment);

  assert.equal(comment.summary.status, "needs-work");
  assert.equal(comment.topFixes.length, 2);
  assert.match(markdown, /## Agent Ready/);
  assert.match(markdown, /Agent compatibility:/);
  assert.match(markdown, /missing-agents-md/);
});

test("benchmark ranks multiple repositories and renders a leaderboard", async () => {
  const benchmark = await benchmarkRepos(["node-app", "bad-agent-docs"], { root: fixture("") });
  const report = renderBenchmarkReport(benchmark);
  const leaderboard = renderLeaderboard(benchmark);
  const roadmap = renderRoadmap(benchmark);

  assert.equal(benchmark.count, 2);
  assert.equal(benchmark.repos[0].name, "fixture-node-app");
  assert.ok(benchmark.repos[0].score > benchmark.repos[1].score);
  assert.ok(benchmark.commonFindings.some((finding) => finding.ruleId === "missing-agents-md"));
  assert.deepEqual(benchmark.commonFindings.find((finding) => finding.ruleId === "missing-agents-md").repositories.sort(), ["bad-agent-docs", "fixture-node-app"]);
  assert.match(report, /Agent Readiness Benchmark/);
  assert.match(report, /\| 1 \| fixture-node-app \|/);
  assert.match(report, /missing-agents-md/);
  assert.match(leaderboard, /Agent Readiness Leaderboard/);
  assert.match(leaderboard, /Most Common Gaps/);
  assert.match(roadmap, /Agent Readiness Roadmap/);
  assert.match(roadmap, /Phase 1: Establish Agent Handoff/);
});

test("GitHub annotations render findings with workflow command escaping", () => {
  const output = renderAnnotations([
    {
      severity: "warning",
      ruleId: "path:rule,one",
      file: "docs/a:b,c.md",
      message: "Use 100% coverage\nwhen practical.",
      fixSuggestion: "Update docs, then run: npm test",
    },
    {
      severity: "info",
      ruleId: "missing-ci",
      file: ".github/workflows",
      message: "No CI workflow was detected.",
      fixSuggestion: "Add CI.",
    },
  ]);

  assert.match(output, /^::warning file=docs\/a%3Ab%2Cc\.md,title=path%3Arule%2Cone::/);
  assert.match(output, /100%25 coverage%0Awhen practical/);
  assert.match(output, /run: npm test/);
  assert.match(output, /::notice file=\.github\/workflows,title=missing-ci::/);
});

test("GitHub annotations emit a notice when there are no findings", () => {
  assert.equal(renderAnnotations([]), "::notice title=agent-ready::No findings.");
});

test("doctor report includes score and next action", async () => {
  const profile = await scanRepo(fixture("empty-repo"));
  const findings = await lintRepo(profile);
  const score = scoreRepo(profile, findings);
  const output = renderDoctor(profile, findings, score);

  assert.match(output, /agent-ready doctor:/);
  assert.match(output, /Top fixes:/);
  assert.match(output, /agent-ready init --dry-run/);
});

test("optional agent-ready.json references do not count as stale paths", async () => {
  const profile = await scanRepo(path.join(__dirname, ".."));
  const findings = await lintRepo(profile);

  assert.equal(findings.some((finding) => finding.ruleId === "stale-path-reference" && finding.message.includes("agent-ready.json")), false);
});

test("shim docs that reference AGENTS.md do not need duplicate sections", async () => {
  const profile = await scanRepo(path.join(__dirname, ".."));
  const findings = await lintRepo(profile);

  assert.equal(findings.some((finding) => finding.file === "CLAUDE.md" && finding.ruleId === "missing-safety-section"), false);
  assert.equal(findings.some((finding) => finding.file === "GEMINI.md" && finding.ruleId === "missing-verification-section"), false);
});

test("scan applies agent-ready.json command and doc overrides", async () => {
  const profile = await scanRepo(fixture("configured-app"));

  assert.equal(profile.config.file, "agent-ready.json");
  assert.deepEqual(profile.config.targets, ["codex", "cursor"]);
  assert.equal(profile.commands.test, "npm run test:ci");
  assert.equal(profile.commands.lint, "npm run lint:ci");
  assert.equal(profile.docs.architecture, "docs/system.md");
  assert.equal(profile.docs.adrDirectory, "docs/decisions");
});

test("workflow renderer validates mode and fail-under values", () => {
  assert.match(renderCiWorkflow({ mode: "action", failUnder: "90" }), /uses: EShener\/agent-ready@v0\.1\.20/);
  assert.match(renderCiWorkflow({ mode: "action", comment: true }), /comment: true/);
  assert.match(renderCiWorkflow({ mode: "action", comment: true }), /pull-requests: write/);
  assert.match(renderCiWorkflow({ mode: "npx", failUnder: "70" }), /npx agent-ready score --fail-under 70/);
  assert.throws(() => renderCiWorkflow({ mode: "bad" }), /--mode/);
  assert.throws(() => renderCiWorkflow({ failUnder: "101" }), /--fail-under/);
  assert.throws(() => renderCiWorkflow({ mode: "npx", comment: true }), /--comment/);
});

test("workflow writer plans, writes, and skips generated CI files", async () => {
  const temp = await fs.mkdtemp(path.join("/tmp", "agent-ready-workflow-"));
  const target = path.join(temp, ".github", "workflows", "custom.yml");

  assert.deepEqual(await writeCiWorkflow({ root: temp, output: ".github/workflows/custom.yml", dryRun: true }), {
    action: "planned",
    file: ".github/workflows/custom.yml",
  });
  await assert.rejects(fs.access(target));

  assert.deepEqual(await writeCiWorkflow({ root: temp, output: ".github/workflows/custom.yml", failUnder: "77" }), {
    action: "written",
    file: ".github/workflows/custom.yml",
  });
  assert.match(await fs.readFile(target, "utf8"), /fail-under: 77/);

  assert.deepEqual(await writeCiWorkflow({ root: temp, output: ".github/workflows/custom.yml" }), {
    action: "skipped",
    file: ".github/workflows/custom.yml",
  });

  assert.deepEqual(await writeCiWorkflow({ root: temp, output: ".github/workflows/custom.yml", failUnder: "66", force: true }), {
    action: "written",
    file: ".github/workflows/custom.yml",
  });
  assert.match(await fs.readFile(target, "utf8"), /fail-under: 66/);
});

test("reusable action writes a GitHub Step Summary before scoring", async () => {
  const action = await fs.readFile(path.join(__dirname, "..", "action.yml"), "utf8");

  assert.match(action, /Write agent-ready summary/);
  assert.match(action, /GITHUB_STEP_SUMMARY/);
  assert.match(action, /Annotate agent-ready findings/);
  assert.match(action, /Comment on pull request/);
  assert.match(action, /agent-ready-comment/);
  assert.match(action, /issues\/\$PR_NUMBER\/comments/);
  assert.match(action, /github-token/);
  assert.match(action, /annotations --config/);
  assert.match(action, /doctor --config/);
  assert.match(action, /matrix --config/);
  assert.match(action, /comment --config/);
  assert.match(action, /report --config/);
  assert.match(action, /Score agent readiness/);
});
