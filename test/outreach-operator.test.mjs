import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSearchCommands, renderOutreachInbox, selectOutreachCandidates, shouldUseOutreachDraft } from "../src/outreach-operator.mjs";

test("outreach operator builds bounded GitHub search commands", () => {
  const commands = buildSearchCommands({ limitPerQuery: 12 });

  assert.ok(commands.length >= 3);
  assert.deepEqual(commands[0].args.slice(0, 3), ["search", "repos", commands[0].query]);
  assert.ok(commands.every((command) => command.args.includes("--json")));
  assert.ok(commands.every((command) => command.args.includes("12")));
});

test("outreach operator selects unique relevant candidates and skips risky repos", () => {
  const contactedAt = "2026-05-30T00:00:00.000Z";
  const results = [
    {
      queryName: "coding-agent",
      repositories: [
        { fullName: "EShener/agent-ready", description: "Make repos ready for agents", stargazersCount: 1, isArchived: false, isFork: false },
        { fullName: "old/contacted", description: "AI coding agent", stargazersCount: 80, isArchived: false, isFork: false },
        { fullName: "archived/agent", description: "AI coding agent", stargazersCount: 80, isArchived: true, isFork: false },
        { fullName: "forked/agent", description: "AI coding agent", stargazersCount: 80, isArchived: false, isFork: true },
        { fullName: "small/random", description: "random utility", stargazersCount: 1, isArchived: false, isFork: false },
        { fullName: "team/local-agent", description: "Local-first AI coding agent with tools", stargazersCount: 42, isArchived: false, isFork: false },
      ],
    },
    {
      queryName: "local-agent",
      repositories: [
        { fullName: "team/local-agent", description: "Duplicate result", stargazersCount: 42, isArchived: false, isFork: false },
        { fullName: "org/agent-framework", description: "Agentic coding framework with Claude Code support", stargazersCount: 25, isArchived: false, isFork: false },
      ],
    },
  ];
  const ledger = {
    contacted: {
      "old/contacted": { issueUrl: "https://github.com/old/contacted/issues/1", contactedAt },
    },
  };

  const candidates = selectOutreachCandidates(results, ledger, { minStars: 5, limit: 5 });

  assert.deepEqual(
    candidates.map((candidate) => candidate.fullName),
    ["team/local-agent", "org/agent-framework"],
  );
  assert.ok(candidates[0].reasons.includes("mentions local-first or offline agent usage"));
  assert.ok(candidates[0].reasons.includes("mentions AI coding agent workflows"));
});

test("outreach inbox renders drafts with safety guardrails", () => {
  const inbox = renderOutreachInbox({
    generatedAt: "2026-05-31T10:30:00.000Z",
    candidates: [
      {
        fullName: "team/local-agent",
        url: "https://github.com/team/local-agent",
        description: "Local-first AI coding agent with tools",
        stargazersCount: 42,
        score: 9,
        reasons: ["mentions AI coding agent workflows"],
      },
    ],
    drafts: [
      {
        fullName: "team/local-agent",
        issueTitle: "Add agent handoff docs and readiness checks",
        issueBody: "Hi maintainers,\n\nA local dry run suggests...",
      },
    ],
    posted: [],
    errors: [],
    dryRun: true,
  });

  assert.match(inbox, /Outreach Inbox/);
  assert.match(inbox, /Default mode: draft-only/);
  assert.match(inbox, /team\/local-agent/);
  assert.match(inbox, /Add agent handoff docs and readiness checks/);
  assert.match(inbox, /No star requests/);
});

test("outreach operator only uses drafts with a meaningful readiness lift", () => {
  assert.equal(shouldUseOutreachDraft({ score: { before: 63, after: 96, delta: 33 } }), true);
  assert.equal(shouldUseOutreachDraft({ score: { before: 0, after: 0, delta: 0 } }), false);
  assert.equal(shouldUseOutreachDraft({ score: { before: 79, after: 84, delta: 5 } }), false);
});
