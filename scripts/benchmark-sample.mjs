#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const benchmarkRoot = process.env.AGENT_READY_BENCHMARK_DIR || path.join(os.tmpdir(), "agent-ready-benchmark-sample");

const repos = [
  ["openai-node", "https://github.com/openai/openai-node.git", "200211197931763ed43b7ff41839b53e4dbfdf6e"],
  ["vercel-ai", "https://github.com/vercel/ai.git", "9f1e1ba4b93b514f6cca1c8452e6a1fb23e44907"],
  ["mcp-typescript-sdk", "https://github.com/modelcontextprotocol/typescript-sdk.git", "5fc42e9be115a8865cca42541bb50183dc2e8b93"],
  ["anthropic-sdk-typescript", "https://github.com/anthropics/anthropic-sdk-typescript.git", "32ce8c0d08074532deb3a3be9dc128cd7924092e"],
  ["browser-use", "https://github.com/browser-use/browser-use.git", "5a745a8502331ff2dcf26ec96fc34b706ae7548b"],
  ["opencode", "https://github.com/sst/opencode.git", "7d2c1ce6c6ad0a4d8f1cab7397d573bc082a1c8f"],
];

fs.mkdirSync(benchmarkRoot, { recursive: true });

for (const [name, url, commit] of repos) {
  const target = path.join(benchmarkRoot, name);
  if (fs.existsSync(path.join(target, ".git"))) {
    const current = capture("git", ["-C", target, "rev-parse", "HEAD"]);
    if (current !== commit) {
      console.error(`Existing checkout ${target} is at ${current}, expected ${commit}.`);
      console.error("Use a fresh AGENT_READY_BENCHMARK_DIR to reproduce the pinned sample.");
      process.exit(1);
    }
    console.error(`Using pinned checkout: ${target}`);
    continue;
  }
  fs.mkdirSync(target, { recursive: true });
  run("git", ["-C", target, "init", "--quiet"]);
  run("git", ["-C", target, "remote", "add", "origin", url]);
  run("git", ["-C", target, "fetch", "--depth", "1", "origin", commit]);
  run("git", ["-C", target, "checkout", "--quiet", "FETCH_HEAD"]);
}

run(process.execPath, [
  path.join(root, "bin", "agent-ready.mjs"),
  "benchmark",
  "--root",
  benchmarkRoot,
  ...repos.map(([name]) => name),
]);

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function capture(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(result.stderr || "");
    process.exit(result.status ?? 1);
  }
  return result.stdout.trim();
}
