export const DEFAULT_DISCOVERY_QUERIES = [
  {
    name: "ai-coding-agent",
    query: "AI coding agent stars:5..1000 pushed:>2026-01-01",
  },
  {
    name: "agentic-coding-cli",
    query: "agentic coding CLI stars:5..1000 pushed:>2026-01-01",
  },
  {
    name: "local-first-agent",
    query: "local-first AI agent CLI stars:5..1000 pushed:>2026-01-01",
  },
  {
    name: "claude-codex-cursor",
    query: "Claude Code Codex Cursor stars:5..1000 pushed:>2026-01-01",
  },
];

const SEARCH_JSON_FIELDS = "fullName,description,stargazersCount,url,updatedAt,isArchived,isFork";

export function buildSearchCommands(options = {}) {
  const limit = positiveInteger(options.limitPerQuery, 20);
  const queries = options.queries?.length ? options.queries : DEFAULT_DISCOVERY_QUERIES;
  return queries.map((entry) => ({
    name: entry.name,
    query: entry.query,
    args: ["search", "repos", entry.query, "--json", SEARCH_JSON_FIELDS, "--limit", String(limit)],
  }));
}

export function selectOutreachCandidates(searchResults = [], ledger = {}, options = {}) {
  const limit = positiveInteger(options.limit, 5);
  const minStars = Number.isFinite(Number(options.minStars)) ? Number(options.minStars) : 5;
  const ownOwners = new Set((options.ownOwners || ["EShener"]).map((owner) => owner.toLowerCase()));
  const recontactAfterDays = positiveInteger(options.recontactAfterDays, 90);
  const seen = new Map();

  for (const result of searchResults) {
    for (const repo of result.repositories || []) {
      const normalized = normalizeRepository(repo, result.queryName || result.name);
      if (!normalized.fullName) continue;
      if (normalized.isArchived || normalized.isFork) continue;
      if (normalized.stargazersCount < minStars) continue;
      if (ownOwners.has(normalized.owner.toLowerCase())) continue;
      if (isRecentlyContacted(normalized.fullName, ledger, recontactAfterDays)) continue;

      const existing = seen.get(normalized.fullName);
      if (existing) {
        existing.queryNames = [...new Set([...existing.queryNames, ...normalized.queryNames])];
        existing.reasons = [...new Set([...existing.reasons, ...normalized.reasons])];
        existing.score = Math.max(existing.score, normalized.score);
      } else {
        seen.set(normalized.fullName, normalized);
      }
    }
  }

  return [...seen.values()]
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || b.stargazersCount - a.stargazersCount || a.fullName.localeCompare(b.fullName))
    .slice(0, limit);
}

export function buildIssueTitle() {
  return "Add agent handoff docs and readiness checks";
}

export function buildIssueBodyFromOutreach(outreachMarkdown) {
  return String(outreachMarkdown || "").replace(/^# .+\n\n/, "").trim();
}

export function shouldUseOutreachDraft(outreach, options = {}) {
  const score = outreach?.score || {};
  const before = Number(score.before || 0);
  const after = Number(score.after || 0);
  const delta = Number(score.delta ?? after - before);
  const minDelta = positiveInteger(options.minDelta, 20);
  const minAfter = positiveInteger(options.minAfter, 80);
  return delta >= minDelta && after >= minAfter;
}

export function renderOutreachInbox(report = {}) {
  const generatedAt = report.generatedAt || new Date().toISOString();
  const candidates = report.candidates || [];
  const drafts = report.drafts || [];
  const posted = report.posted || [];
  const skipped = report.skipped || [];
  const errors = report.errors || [];
  const dryRun = report.dryRun !== false;

  return `# Outreach Inbox

Generated: ${generatedAt}
Mode: ${dryRun ? "draft-only" : "posting-enabled"}

## Guardrails

- Default mode: draft-only. Public posting requires an explicit posting flag and environment opt-in.
- No star requests.
- No invented affiliation, endorsement, or personal usage stories.
- Only contact repositories with a concrete agent-readiness gap and a repo-specific draft.
- Skip repositories already contacted recently.

## Candidates

${renderCandidates(candidates)}

## Drafts

${renderDrafts(drafts)}

## Posted

${posted.length ? posted.map((item) => `- ${item.fullName}: ${item.issueUrl}`).join("\n") : "- None."}

## Skipped

${skipped.length ? skipped.map((item) => `- ${item.fullName}: ${item.reason}`).join("\n") : "- None."}

## Errors

${errors.length ? errors.map((item) => `- ${item.fullName || item.step}: ${item.message}`).join("\n") : "- None."}
`;
}

function normalizeRepository(repo, queryName) {
  const fullName = repo.fullName || "";
  const [owner = "", name = ""] = fullName.split("/");
  const description = repo.description || "";
  const reasons = buildReasons(`${fullName} ${description}`);
  return {
    fullName,
    owner,
    name,
    description,
    url: repo.url || (fullName ? `https://github.com/${fullName}` : ""),
    stargazersCount: Number(repo.stargazersCount || 0),
    updatedAt: repo.updatedAt || "",
    isArchived: Boolean(repo.isArchived),
    isFork: Boolean(repo.isFork),
    queryNames: queryName ? [queryName] : [],
    reasons,
    score: scoreRepository({ fullName, description, stargazersCount: Number(repo.stargazersCount || 0), reasons }),
  };
}

function buildReasons(text) {
  const normalized = text.toLowerCase();
  const reasons = [];
  if (/(ai coding agent|coding agent|agentic coding|agent framework|claude code|codex|cursor|gemini|copilot)/.test(normalized)) {
    reasons.push("mentions AI coding agent workflows");
  }
  if (/(local-first|offline|ollama|runs locally|local cli)/.test(normalized)) {
    reasons.push("mentions local-first or offline agent usage");
  }
  if (/(cli|developer tool|devtool|mcp|tool-use|tool use)/.test(normalized)) {
    reasons.push("developer-tooling audience");
  }
  if (/(agents\.md|claude\.md|cursor|copilot-instructions|gemini\.md)/.test(normalized)) {
    reasons.push("already near the agent-instructions category");
  }
  return reasons;
}

function scoreRepository(repo) {
  let score = Math.min(5, Math.floor(Math.log10(Math.max(repo.stargazersCount, 1)) * 2));
  score += repo.reasons.length * 3;
  if (repo.stargazersCount >= 5 && repo.stargazersCount <= 1000) score += 2;
  if (/template|example|starter|framework|cli/i.test(`${repo.fullName} ${repo.description}`)) score += 1;
  return score;
}

function isRecentlyContacted(fullName, ledger, recontactAfterDays) {
  const contacted = ledger?.contacted?.[fullName] || ledger?.suppressed?.[fullName];
  if (!contacted) return false;
  if (!contacted.contactedAt) return true;
  const timestamp = Date.parse(contacted.contactedAt);
  if (!Number.isFinite(timestamp)) return true;
  const ageMs = Date.now() - timestamp;
  return ageMs < recontactAfterDays * 24 * 60 * 60 * 1000;
}

function renderCandidates(candidates) {
  if (!candidates.length) return "- None found.";
  return candidates
    .map((candidate, index) => {
      const reasons = candidate.reasons.length ? candidate.reasons.join("; ") : "matched discovery query";
      return `${index + 1}. [${candidate.fullName}](${candidate.url}) - ${candidate.stargazersCount} stars, score ${candidate.score}. ${reasons}.`;
    })
    .join("\n");
}

function renderDrafts(drafts) {
  if (!drafts.length) return "- None generated.";
  return drafts
    .map(
      (draft, index) => `${index + 1}. ${draft.fullName}

Title: ${draft.issueTitle}

\`\`\`md
${draft.issueBody}
\`\`\``,
    )
    .join("\n\n");
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
