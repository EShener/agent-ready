import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { benchmarkRepos } from "../src/benchmark.mjs";
import { buildAgentsMd, planGeneratedArtifacts } from "../src/generator.mjs";
import { lintRepo, scoreRepo } from "../src/linter.mjs";
import { renderAnnotations, renderBenchmarkReport, renderDoctor, renderMarkdownReport } from "../src/reporter.mjs";
import { scanRepo } from "../src/scanner.mjs";
import { renderCiWorkflow } from "../src/workflow.mjs";

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

test("benchmark ranks multiple repositories and renders a leaderboard", async () => {
  const benchmark = await benchmarkRepos(["node-app", "bad-agent-docs"], { root: fixture("") });
  const report = renderBenchmarkReport(benchmark);

  assert.equal(benchmark.count, 2);
  assert.equal(benchmark.repos[0].name, "fixture-node-app");
  assert.ok(benchmark.repos[0].score > benchmark.repos[1].score);
  assert.match(report, /Agent Readiness Benchmark/);
  assert.match(report, /\| 1 \| fixture-node-app \|/);
  assert.match(report, /missing-agents-md/);
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
  assert.match(renderCiWorkflow({ mode: "action", failUnder: "90" }), /uses: EShener\/agent-ready@v0\.1\.3/);
  assert.match(renderCiWorkflow({ mode: "npx", failUnder: "70" }), /npx agent-ready score --fail-under 70/);
  assert.throws(() => renderCiWorkflow({ mode: "bad" }), /--mode/);
  assert.throws(() => renderCiWorkflow({ failUnder: "101" }), /--fail-under/);
});

test("reusable action writes a GitHub Step Summary before scoring", async () => {
  const action = await fs.readFile(path.join(__dirname, "..", "action.yml"), "utf8");

  assert.match(action, /Write agent-ready summary/);
  assert.match(action, /GITHUB_STEP_SUMMARY/);
  assert.match(action, /Annotate agent-ready findings/);
  assert.match(action, /annotations --config/);
  assert.match(action, /doctor --config/);
  assert.match(action, /report --config/);
  assert.match(action, /Score agent readiness/);
});
