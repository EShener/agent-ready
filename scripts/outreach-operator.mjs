#!/usr/bin/env node

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  buildIssueBodyFromOutreach,
  buildIssueTitle,
  buildSearchCommands,
  renderOutreachInbox,
  selectOutreachCandidates,
  shouldUseOutreachDraft,
} from "../src/outreach-operator.mjs";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

run().catch((error) => {
  console.error(`outreach-operator: ${error.message}`);
  if (process.env.DEBUG) console.error(error.stack);
  process.exitCode = 1;
});

async function run() {
  const flags = parseFlags(process.argv.slice(2));
  const workDir = path.resolve(root, flags.workdir || ".agent-ready/outreach");
  const reportPath = path.resolve(root, flags.report || ".agent-ready/outreach/inbox.md");
  const ledgerPath = path.resolve(root, flags.ledger || ".agent-ready/outreach/ledger.json");
  const limitPerQuery = positiveInteger(flags["limit-per-query"], 20);
  const maxCandidates = positiveInteger(flags["max-candidates"], 8);
  const maxDrafts = positiveInteger(flags["max-drafts"], 3);
  const maxPosts = positiveInteger(flags["max-posts"], 1);
  const dryRun = !flags.post;
  const errors = [];
  const posted = [];
  const skipped = [];

  await fs.mkdir(workDir, { recursive: true });
  const ledger = await readJson(ledgerPath, { contacted: {}, suppressed: {} });
  const searchResults = await discoverRepositories({ limitPerQuery, errors });
  const candidates = selectOutreachCandidates(searchResults, ledger, { limit: maxCandidates });
  const drafts = [];

  for (const candidate of candidates) {
    if (drafts.length >= maxDrafts) break;
    try {
      const draft = await buildDraft(candidate, workDir);
      if (draft.skipped) {
        skipped.push({ fullName: candidate.fullName, reason: draft.reason });
        continue;
      }
      drafts.push(draft);
      if (!dryRun && canPostPublicly()) {
        if (posted.length >= maxPosts) continue;
        const similarIssues = await findSimilarIssues(candidate.fullName);
        if (similarIssues.length) {
          errors.push({ fullName: candidate.fullName, message: `Skipped posting because similar issue exists: ${similarIssues[0].url}` });
          continue;
        }
        const issueUrl = await postIssue(candidate.fullName, draft.issueTitle, draft.issueBody);
        posted.push({ fullName: candidate.fullName, issueUrl });
        ledger.contacted[candidate.fullName] = { issueUrl, contactedAt: new Date().toISOString(), source: "outreach-operator" };
      }
    } catch (error) {
      errors.push({ fullName: candidate.fullName, message: error.message });
    }
  }

  if (!dryRun && flags.post && !canPostPublicly()) {
    errors.push({ step: "post", message: "Set AGENT_READY_OUTREACH_POST=1 to allow public posting." });
  }

  await writeJson(ledgerPath, ledger);
  const inbox = renderOutreachInbox({
    generatedAt: new Date().toISOString(),
    candidates,
    drafts,
    posted,
    skipped,
    errors,
    dryRun,
  });
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, inbox, "utf8");
  console.log(`wrote: ${path.relative(root, reportPath)}`);
  console.log(`candidates: ${candidates.length}, drafts: ${drafts.length}, posted: ${posted.length}`);
}

async function discoverRepositories({ limitPerQuery, errors }) {
  const results = [];
  for (const command of buildSearchCommands({ limitPerQuery })) {
    try {
      const { stdout } = await execFileAsync("gh", command.args, { cwd: root, maxBuffer: 1024 * 1024 * 8 });
      results.push({ queryName: command.name, repositories: JSON.parse(stdout) });
    } catch (error) {
      errors.push({ step: command.name, message: error.message });
    }
  }
  return results;
}

async function buildDraft(candidate, workDir) {
  const cloneDir = path.join(workDir, "repos", candidate.fullName.replace(/[^\w.-]+/g, "__"));
  await cloneOrUpdate(candidate.fullName, cloneDir);
  const jsonResult = await execFileAsync(process.execPath, [path.join(root, "bin", "agent-ready.mjs"), "outreach", "--root", cloneDir, "--format", "json"], {
    cwd: root,
    maxBuffer: 1024 * 1024 * 8,
  });
  const outreach = JSON.parse(jsonResult.stdout);
  if (!shouldUseOutreachDraft(outreach)) {
    const score = outreach.score || {};
    return {
      fullName: candidate.fullName,
      skipped: true,
      reason: `readiness lift is not strong enough (${score.before ?? "?"}/100 -> ${score.after ?? "?"}/100, delta ${score.delta ?? "?"})`,
    };
  }
  const { stdout } = await execFileAsync(process.execPath, [path.join(root, "bin", "agent-ready.mjs"), "outreach", "--root", cloneDir], {
    cwd: root,
    maxBuffer: 1024 * 1024 * 8,
  });
  return {
    fullName: candidate.fullName,
    issueTitle: buildIssueTitle(candidate),
    issueBody: buildIssueBodyFromOutreach(stdout),
  };
}

async function cloneOrUpdate(fullName, cloneDir) {
  try {
    await fs.access(path.join(cloneDir, ".git"));
    await execFileAsync("git", ["-C", cloneDir, "pull", "--ff-only"], { maxBuffer: 1024 * 1024 * 4 });
  } catch {
    await fs.rm(cloneDir, { recursive: true, force: true });
    await fs.mkdir(path.dirname(cloneDir), { recursive: true });
    await execFileAsync("git", ["clone", "--depth", "1", `https://github.com/${fullName}.git`, cloneDir], { maxBuffer: 1024 * 1024 * 4 });
  }
}

async function findSimilarIssues(fullName) {
  try {
    const { stdout } = await execFileAsync(
      "gh",
      ["issue", "list", "-R", fullName, "--state", "all", "--search", "agent-ready OR AGENTS.md OR CLAUDE.md", "--limit", "5", "--json", "title,url,state"],
      { cwd: root, maxBuffer: 1024 * 1024 * 2 },
    );
    return JSON.parse(stdout);
  } catch {
    return [];
  }
}

async function postIssue(fullName, title, body) {
  const { stdout } = await execFileAsync("gh", ["issue", "create", "-R", fullName, "--title", title, "--body", body], {
    cwd: root,
    maxBuffer: 1024 * 1024 * 4,
  });
  return stdout.trim();
}

function canPostPublicly() {
  return process.env.AGENT_READY_OUTREACH_POST === "1";
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseFlags(argv) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) flags[key] = true;
    else {
      flags[key] = next;
      index += 1;
    }
  }
  return flags;
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
