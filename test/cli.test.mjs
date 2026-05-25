import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { parseCli } from "../src/cli.mjs";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const bin = path.join(root, "bin", "agent-ready.mjs");
const fixture = (name) => path.join(__dirname, "fixtures", name);

test("parseCli parses flags and command", () => {
  const parsed = parseCli(["init", "--root", "repo", "--targets", "codex,cursor", "--dry-run"]);
  assert.equal(parsed.command, "init");
  assert.equal(parsed.flags.root, "repo");
  assert.equal(parsed.flags.targets, "codex,cursor");
  assert.equal(parsed.flags["dry-run"], true);
});

test("scan CLI emits JSON when requested", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "scan", "--root", fixture("node-app"), "--format", "json"], { cwd: root });
  const payload = JSON.parse(stdout);
  assert.equal(payload.name, "fixture-node-app");
});

test("init CLI dry-run reports planned files", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "init", "--root", fixture("node-app"), "--targets", "codex,cursor", "--dry-run"], { cwd: root });
  assert.match(stdout, /planned: AGENTS\.md/);
  assert.match(stdout, /planned: \.cursor\/rules\/agent-ready\.mdc/);
});

test("init CLI uses configured targets when --targets is omitted", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "init", "--root", fixture("configured-app"), "--dry-run"], { cwd: root });
  assert.match(stdout, /planned: AGENTS\.md/);
  assert.match(stdout, /planned: \.cursor\/rules\/agent-ready\.mdc/);
  assert.doesNotMatch(stdout, /CLAUDE\.md/);
});

test("init CLI can use enterprise preset readiness artifacts", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "agent-ready-init-preset-"));
  await fs.writeFile(path.join(temp, "package.json"), JSON.stringify({ name: "init-preset", scripts: { test: "node --test" } }), "utf8");

  const { stdout } = await execFileAsync(process.execPath, [bin, "init", "--root", temp, "--preset", "enterprise", "--dry-run"], { cwd: root });

  assert.match(stdout, /planned: AGENTS\.md/);
  assert.match(stdout, /planned: \.github\/pull_request_template\.md/);
  assert.match(stdout, /planned: \.env\.example/);
  assert.match(stdout, /planned: SECURITY\.md/);
  assert.doesNotMatch(stdout, /\.github\/workflows\/agent-ready\.yml/);
  await assert.rejects(fs.access(path.join(temp, "SECURITY.md")));
});

test("init CLI interactive defaults to dry-run planning", async () => {
  const { stdout } = await runWithInput(["init", "--root", fixture("node-app"), "--interactive"], "\n\n");

  assert.match(stdout, /agent-ready init: fixture-node-app/);
  assert.match(stdout, /Targets \[codex,claude,cursor,gemini,copilot\]/);
  assert.match(stdout, /planned: AGENTS\.md/);
  assert.match(stdout, /planned: CLAUDE\.md/);
});

test("fix CLI plans agent docs and CI workflow", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "agent-ready-fix-plan-"));
  await fs.writeFile(path.join(temp, "package.json"), JSON.stringify({ scripts: { test: "node --test" } }), "utf8");

  const { stdout } = await execFileAsync(process.execPath, [bin, "fix", "--root", temp, "--targets", "codex,copilot", "--dry-run", "--fail-under", "82"], { cwd: root });

  assert.match(stdout, /planned: AGENTS\.md/);
  assert.match(stdout, /planned: \.github\/copilot-instructions\.md/);
  assert.match(stdout, /planned: \.github\/workflows\/agent-ready\.yml/);
  await assert.rejects(fs.access(path.join(temp, "AGENTS.md")));
});

test("fix CLI can plan team and full readiness artifacts", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "agent-ready-fix-level-"));
  await fs.writeFile(path.join(temp, "package.json"), JSON.stringify({ scripts: { test: "node --test", lint: "eslint ." } }), "utf8");

  const team = await execFileAsync(process.execPath, [bin, "fix", "--root", temp, "--level", "team", "--dry-run", "--no-ci"], { cwd: root });
  assert.match(team.stdout, /planned: \.github\/pull_request_template\.md/);
  assert.match(team.stdout, /planned: docs\/architecture\.md/);
  assert.match(team.stdout, /planned: docs\/adr\/0001-agent-readiness\.md/);
  assert.doesNotMatch(team.stdout, /\.env\.example/);

  const full = await execFileAsync(process.execPath, [bin, "fix", "--root", temp, "--level", "full", "--dry-run", "--no-ci"], { cwd: root });
  assert.match(full.stdout, /planned: \.env\.example/);
  assert.match(full.stdout, /planned: \.github\/CODEOWNERS/);
  assert.match(full.stdout, /planned: \.github\/ISSUE_TEMPLATE\/agent-readiness\.md/);
});

test("fix CLI team preset writes PR comment workflow", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "agent-ready-fix-preset-"));
  await fs.writeFile(path.join(temp, "package.json"), JSON.stringify({ name: "fix-preset", scripts: { test: "node --test" } }), "utf8");

  const { stdout } = await execFileAsync(process.execPath, [bin, "fix", "--root", temp, "--preset", "team"], { cwd: root });
  const workflow = await fs.readFile(path.join(temp, ".github", "workflows", "agent-ready.yml"), "utf8");

  assert.match(stdout, /created: AGENTS\.md/);
  assert.match(stdout, /created: \.github\/pull_request_template\.md/);
  assert.match(stdout, /written: \.github\/workflows\/agent-ready\.yml/);
  assert.match(workflow, /pull-requests: write/);
  assert.match(workflow, /comment: true/);
});

test("fix CLI writes docs and can skip CI", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "agent-ready-fix-write-"));
  await fs.writeFile(path.join(temp, "package.json"), JSON.stringify({ scripts: { test: "node --test" } }), "utf8");

  const { stdout } = await execFileAsync(process.execPath, [bin, "fix", "--root", temp, "--targets", "codex", "--no-ci"], { cwd: root });

  assert.match(stdout, /created: AGENTS\.md/);
  assert.match(await fs.readFile(path.join(temp, "AGENTS.md"), "utf8"), /Safety Boundaries/);
  await assert.rejects(fs.access(path.join(temp, ".github", "workflows", "agent-ready.yml")));
});

test("improve CLI dry-run reports planned changes without writing", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "agent-ready-improve-plan-"));
  await fs.writeFile(path.join(temp, "package.json"), JSON.stringify({ name: "improve-demo", scripts: { test: "node --test", lint: "eslint ." } }), "utf8");

  const { stdout } = await execFileAsync(process.execPath, [bin, "improve", "--root", temp, "--level", "team", "--dry-run", "--no-ci"], { cwd: root });

  assert.match(stdout, /Agent Ready Improvement/);
  assert.match(stdout, /Mode: dry-run/);
  assert.match(stdout, /estimated \+\d+/);
  assert.match(stdout, /\| planned \| AGENTS\.md \| codex \|/);
  assert.match(stdout, /\| planned \| \.github\/pull_request_template\.md \| pull-request-template \|/);
  await assert.rejects(fs.access(path.join(temp, "AGENTS.md")));
});

test("improve CLI enterprise preset emits JSON with full governance plan", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "agent-ready-improve-preset-"));
  await fs.writeFile(path.join(temp, "package.json"), JSON.stringify({ name: "improve-preset", scripts: { test: "node --test" } }), "utf8");

  const { stdout } = await execFileAsync(process.execPath, [bin, "improve", "--root", temp, "--preset", "enterprise", "--dry-run", "--format", "json"], { cwd: root });
  const payload = JSON.parse(stdout);

  assert.equal(payload.preset, "enterprise");
  assert.equal(payload.level, "full");
  assert.equal(payload.ci.action, "planned");
  assert.ok(payload.artifacts.some((item) => item.file === ".env.example"));
  assert.ok(payload.artifacts.some((item) => item.file === ".github/CODEOWNERS"));
});

test("improve CLI applies changes and reports a score delta", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "agent-ready-improve-write-"));
  await fs.writeFile(path.join(temp, "package.json"), JSON.stringify({ name: "improve-write", scripts: { test: "node --test" } }), "utf8");

  const { stdout } = await execFileAsync(process.execPath, [bin, "improve", "--root", temp, "--targets", "codex", "--no-ci"], { cwd: root });

  assert.match(stdout, /Agent Ready Improvement/);
  assert.match(stdout, /Mode: applied/);
  assert.match(stdout, /\| created \| AGENTS\.md \| codex \|/);
  assert.match(stdout, /Score: \d+\/100 \([A-F]\) -> \d+\/100 \([A-F]\) \(\+\d+\)/);
  assert.match(await fs.readFile(path.join(temp, "AGENTS.md"), "utf8"), /Project Overview/);
});

test("improve CLI emits JSON", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "improve", "--root", fixture("empty-repo"), "--dry-run", "--format", "json", "--no-ci"], { cwd: root });
  const payload = JSON.parse(stdout);

  assert.equal(payload.schemaVersion, 1);
  assert.equal(payload.mode, "dry-run");
  assert.equal(payload.repository.name, "empty-repo");
  assert.equal(typeof payload.score.before, "number");
  assert.equal(payload.score.estimated, true);
  assert.ok(Array.isArray(payload.artifacts));
});

test("improve CLI emits a GitHub issue checklist", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "improve", "--root", fixture("empty-repo"), "--dry-run", "--format", "issue", "--no-ci"], { cwd: root });

  assert.match(stdout, /Improve agent readiness for empty-repo/);
  assert.match(stdout, /- \[ \] Add `AGENTS\.md`/);
  assert.match(stdout, /Remaining Follow-Ups/);
  assert.match(stdout, /- \[ \] Add a README/);
  assert.match(stdout, /Generated by `agent-ready improve --format issue`/);
});

test("badge CLI emits markdown badge", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "badge", "--root", fixture("node-app")], { cwd: root });
  assert.match(stdout, /!\[agent-ready\]\(https:\/\/img\.shields\.io\/badge\/agent--ready-/);
});

test("doctor CLI emits a screenshot-friendly summary", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "doctor", "--root", fixture("node-app")], { cwd: root });
  assert.match(stdout, /agent-ready doctor: fixture-node-app/);
  assert.match(stdout, /Score:/);
  assert.match(stdout, /Top fixes:|Status: ready/);
});

test("examples CLI emits the example gallery", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "examples"], { cwd: root });

  assert.match(stdout, /agent-ready Examples/);
  assert.match(stdout, /Single repository improvement/);
  assert.match(stdout, /docs\/examples\/snapshot\.md/);
});

test("examples CLI emits JSON when requested", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "examples", "--format", "json"], { cwd: root });
  const payload = JSON.parse(stdout);

  assert.equal(payload.schemaVersion, 1);
  assert.ok(payload.examples.some((example) => example.id === "multi-repo-roadmap"));
});

test("explain CLI emits an impact-ranked fix plan", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "explain", "--root", fixture("empty-repo")], { cwd: root });

  assert.match(stdout, /Agent Ready Fix Plan/);
  assert.match(stdout, /\+25 \| missing-agents-md/);
  assert.match(stdout, /Potential score:/);
});

test("explain CLI emits JSON when requested", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "explain", "--root", fixture("empty-repo"), "--format", "json"], { cwd: root });
  const payload = JSON.parse(stdout);

  assert.equal(payload.repository.name, "empty-repo");
  assert.equal(payload.items[0].ruleId, "missing-agents-md");
});

test("matrix CLI emits an agent compatibility table", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "agent-ready-matrix-"));
  await fs.writeFile(path.join(temp, "package.json"), JSON.stringify({ name: "matrix-demo" }), "utf8");
  await fs.writeFile(path.join(temp, "AGENTS.md"), "# AGENTS.md\n", "utf8");
  await fs.mkdir(path.join(temp, ".cursor", "rules"), { recursive: true });
  await fs.writeFile(path.join(temp, ".cursor", "rules", "agent-ready.mdc"), "Use AGENTS.md.\n", "utf8");

  const { stdout } = await execFileAsync(process.execPath, [bin, "matrix", "--root", temp], { cwd: root });

  assert.match(stdout, /Agent Compatibility Matrix/);
  assert.match(stdout, /Ready agents: 2\/5/);
  assert.match(stdout, /OpenAI Codex/);
  assert.match(stdout, /Cursor/);
  assert.match(stdout, /Claude Code \| missing/);
});

test("matrix CLI emits JSON when requested", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "matrix", "--root", fixture("empty-repo"), "--format", "json"], { cwd: root });
  const payload = JSON.parse(stdout);

  assert.equal(payload.summary.total, 5);
  assert.equal(payload.entries[0].target, "codex");
});

test("comment CLI emits a GitHub-ready summary", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "comment", "--root", fixture("empty-repo"), "--max-fixes", "2"], { cwd: root });

  assert.match(stdout, /## Agent Ready/);
  assert.match(stdout, /Agent compatibility:/);
  assert.match(stdout, /Top Fixes/);
  assert.match(stdout, /missing-agents-md/);
});

test("comment CLI emits JSON when requested", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "comment", "--root", fixture("empty-repo"), "--format", "json"], { cwd: root });
  const payload = JSON.parse(stdout);

  assert.equal(payload.repository.name, "empty-repo");
  assert.equal(payload.summary.compatibilityTotal, 5);
  assert.ok(payload.topFixes.length > 0);
});

test("compare CLI emits a before and after readiness report", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "agent-ready-compare-"));
  const before = path.join(temp, "before.json");
  const after = path.join(temp, "after.json");
  await fs.writeFile(before, JSON.stringify({
    profile: { name: "demo" },
    findings: [
      { severity: "warning", ruleId: "missing-agents-md", file: "AGENTS.md", message: "Missing AGENTS.md canonical agent instructions." },
    ],
    score: { score: 75, grade: "B", deductions: [{ ruleId: "missing-agents-md", severity: "warning", points: 25, message: "Missing AGENTS.md canonical agent instructions." }] },
  }), "utf8");
  await fs.writeFile(after, JSON.stringify({
    profile: { name: "demo" },
    findings: [],
    score: { score: 100, grade: "A", deductions: [] },
  }), "utf8");

  const { stdout } = await execFileAsync(process.execPath, [bin, "compare", "--before", before, "--after", after], { cwd: root });

  assert.match(stdout, /Agent Ready Comparison/);
  assert.match(stdout, /75\/100 \(B\) -> 100\/100 \(A\) \(\+25\)/);
  assert.match(stdout, /missing-agents-md/);
});

test("compare CLI emits JSON when requested", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "agent-ready-compare-json-"));
  const before = path.join(temp, "before.json");
  const after = path.join(temp, "after.json");
  await fs.writeFile(before, JSON.stringify({ score: 40, grade: "D", deductions: [{ ruleId: "missing-ci", severity: "info", points: 8 }] }), "utf8");
  await fs.writeFile(after, JSON.stringify({ score: 48, grade: "D", deductions: [] }), "utf8");

  const { stdout } = await execFileAsync(process.execPath, [bin, "compare", "--before", before, "--after", after, "--format", "json"], { cwd: root });
  const payload = JSON.parse(stdout);

  assert.equal(payload.delta.score, 8);
  assert.equal(payload.delta.status, "improved");
});

test("snapshot CLI emits a static readiness report", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "snapshot", "--root", fixture("node-app")], { cwd: root });

  assert.match(stdout, /Agent Readiness Snapshot/);
  assert.match(stdout, /Agent compatibility:/);
  assert.match(stdout, /Generated by `agent-ready snapshot`/);
});

test("snapshot CLI can plan and write report files", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "agent-ready-snapshot-"));
  await fs.writeFile(path.join(temp, "package.json"), JSON.stringify({ name: "snapshot-demo", scripts: { test: "node --test" } }), "utf8");
  const target = path.join(temp, "AGENT_READINESS.md");

  const dryRun = await execFileAsync(process.execPath, [bin, "snapshot", "--root", temp, "--write", "--dry-run"], { cwd: root });
  assert.match(dryRun.stdout, /planned: AGENT_READINESS\.md/);
  await assert.rejects(fs.access(target));

  const written = await execFileAsync(process.execPath, [bin, "snapshot", "--root", temp, "--write"], { cwd: root });
  assert.match(written.stdout, /written: AGENT_READINESS\.md/);
  assert.match(await fs.readFile(target, "utf8"), /Agent Readiness Snapshot/);

  const skipped = await execFileAsync(process.execPath, [bin, "snapshot", "--root", temp, "--write"], { cwd: root });
  assert.match(skipped.stdout, /skipped: AGENT_READINESS\.md/);
});

test("annotations CLI emits GitHub workflow commands", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "annotations", "--root", fixture("empty-repo")], { cwd: root });

  assert.match(stdout, /::warning file=AGENTS\.md,title=missing-agents-md::/);
  assert.match(stdout, /Run `agent-ready init --targets codex`/);
});

test("benchmark CLI emits a Markdown leaderboard", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "benchmark", "test/fixtures/node-app", "test/fixtures/bad-agent-docs"], { cwd: root });

  assert.match(stdout, /Agent Readiness Benchmark/);
  assert.match(stdout, /\| 1 \| fixture-node-app \|/);
  assert.match(stdout, /missing-agents-md/);
});

test("benchmark CLI emits JSON when requested", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "benchmark", "--root", "test/fixtures", "node-app", "bad-agent-docs", "--format", "json"], { cwd: root });
  const payload = JSON.parse(stdout);

  assert.equal(payload.count, 2);
  assert.equal(payload.repos[0].name, "fixture-node-app");
});

test("leaderboard CLI emits a shareable Markdown leaderboard", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "leaderboard", "test/fixtures/node-app", "test/fixtures/bad-agent-docs"], { cwd: root });

  assert.match(stdout, /Agent Readiness Leaderboard/);
  assert.match(stdout, /Most Common Gaps/);
  assert.match(stdout, /Share Snippet/);
  assert.match(stdout, /missing-agents-md/);
});

test("leaderboard CLI emits JSON when requested", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "leaderboard", "--root", "test/fixtures", "node-app", "bad-agent-docs", "--format", "json"], { cwd: root });
  const payload = JSON.parse(stdout);

  assert.equal(payload.count, 2);
  assert.ok(payload.commonFindings.some((finding) => finding.ruleId === "missing-agents-md"));
});

test("roadmap CLI emits a phased cleanup plan", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "roadmap", "test/fixtures/node-app", "test/fixtures/bad-agent-docs"], { cwd: root });

  assert.match(stdout, /Agent Readiness Roadmap/);
  assert.match(stdout, /Phase 1: Establish Agent Handoff/);
  assert.match(stdout, /Phase 2: Make Verification Trustworthy/);
  assert.match(stdout, /Generated by `agent-ready roadmap`/);
});

test("roadmap CLI emits JSON when requested", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "roadmap", "--root", "test/fixtures", "node-app", "bad-agent-docs", "--format", "json"], { cwd: root });
  const payload = JSON.parse(stdout);
  const missingAgents = payload.commonFindings.find((finding) => finding.ruleId === "missing-agents-md");

  assert.equal(payload.count, 2);
  assert.deepEqual(missingAgents.repositories.sort(), ["bad-agent-docs", "fixture-node-app"]);
});

test("ci CLI emits reusable GitHub Action workflow by default", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "ci", "--fail-under", "85"], { cwd: root });
  assert.match(stdout, /uses: EShener\/agent-ready@v0\.1\.23/);
  assert.match(stdout, /fail-under: 85/);
});

test("ci CLI can emit a pull request comment workflow", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "ci", "--comment"], { cwd: root });

  assert.match(stdout, /pull-requests: write/);
  assert.match(stdout, /issues: write/);
  assert.match(stdout, /comment: true/);
});

test("ci CLI can write the reusable GitHub Action workflow", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "agent-ready-ci-"));
  const target = path.join(temp, ".github", "workflows", "agent-ready.yml");

  const dryRun = await execFileAsync(process.execPath, [bin, "ci", "--root", temp, "--write", "--dry-run", "--fail-under", "88"], { cwd: root });
  assert.match(dryRun.stdout, /planned: \.github\/workflows\/agent-ready\.yml/);
  await assert.rejects(fs.access(target));

  const written = await execFileAsync(process.execPath, [bin, "ci", "--root", temp, "--write", "--fail-under", "88"], { cwd: root });
  assert.match(written.stdout, /written: \.github\/workflows\/agent-ready\.yml/);
  assert.match(await fs.readFile(target, "utf8"), /fail-under: 88/);

  const skipped = await execFileAsync(process.execPath, [bin, "ci", "--root", temp, "--write"], { cwd: root });
  assert.match(skipped.stdout, /skipped: \.github\/workflows\/agent-ready\.yml/);
});

test("ci CLI can emit npx-based workflow", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "ci", "--mode", "npx", "--fail-under", "75"], { cwd: root });
  assert.match(stdout, /actions\/setup-node@v4/);
  assert.match(stdout, /npx @eshen_fox_mie\/agent-ready score --fail-under 75/);
});

test("score CLI fail-under exits non-zero below threshold", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [bin, "score", "--root", fixture("empty-repo"), "--fail-under", "95"], { cwd: root }),
    /Command failed/,
  );
});

function runWithInput(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [bin, ...args], { cwd: root, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`Command failed with code ${code}\n${stdout}\n${stderr}`));
    });
    child.stdin.end(input);
  });
}
