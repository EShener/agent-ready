import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
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

test("init CLI interactive defaults to dry-run planning", async () => {
  const { stdout } = await runWithInput(["init", "--root", fixture("node-app"), "--interactive"], "\n\n");

  assert.match(stdout, /agent-ready init: fixture-node-app/);
  assert.match(stdout, /Targets \[codex,claude,cursor,gemini,copilot\]/);
  assert.match(stdout, /planned: AGENTS\.md/);
  assert.match(stdout, /planned: CLAUDE\.md/);
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

test("ci CLI emits reusable GitHub Action workflow by default", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "ci", "--fail-under", "85"], { cwd: root });
  assert.match(stdout, /uses: EShener\/agent-ready@v0\.1\.3/);
  assert.match(stdout, /fail-under: 85/);
});

test("ci CLI can emit npx-based workflow", async () => {
  const { stdout } = await execFileAsync(process.execPath, [bin, "ci", "--mode", "npx", "--fail-under", "75"], { cwd: root });
  assert.match(stdout, /actions\/setup-node@v4/);
  assert.match(stdout, /npx agent-ready score --fail-under 75/);
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
