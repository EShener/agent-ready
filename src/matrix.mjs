const AGENT_TARGETS = [
  {
    target: "codex",
    agent: "OpenAI Codex",
    files: ["AGENTS.md"],
  },
  {
    target: "cursor",
    agent: "Cursor",
    files: [".cursor/rules/*.mdc"],
  },
  {
    target: "copilot",
    agent: "GitHub Copilot",
    files: [".github/copilot-instructions.md"],
  },
  {
    target: "claude",
    agent: "Claude Code",
    files: ["CLAUDE.md"],
  },
  {
    target: "gemini",
    agent: "Gemini CLI",
    files: ["GEMINI.md"],
  },
];

export function buildAgentMatrix(profile) {
  const docsByTarget = new Map();
  for (const doc of profile.agentDocs || []) {
    const docs = docsByTarget.get(doc.target) || [];
    docs.push(doc.file);
    docsByTarget.set(doc.target, docs);
  }

  const canonicalFiles = docsByTarget.get("codex") || [];
  const hasCanonical = canonicalFiles.includes("AGENTS.md");
  const entries = AGENT_TARGETS.map((definition) => {
    const files = docsByTarget.get(definition.target) || [];
    const ready = files.length > 0;
    const mode = ready
      ? definition.target === "codex"
        ? "canonical"
        : hasCanonical
          ? "shim"
          : "direct"
      : "missing";

    return {
      target: definition.target,
      agent: definition.agent,
      status: ready ? "ready" : "missing",
      mode,
      files,
      expectedFiles: definition.files,
      nextAction: nextAction(definition.target, ready, mode),
    };
  });

  return {
    schemaVersion: 1,
    repository: {
      name: profile.name,
      root: profile.root,
    },
    summary: {
      ready: entries.filter((entry) => entry.status === "ready").length,
      total: entries.length,
      canonicalSource: hasCanonical ? "AGENTS.md" : "",
    },
    entries,
  };
}

function nextAction(target, ready, mode) {
  if (!ready) return `Run agent-ready init --targets ${target}.`;
  if (mode === "canonical") return "Keep AGENTS.md short, current, and verified in CI.";
  if (mode === "shim") return "Keep this shim pointing to AGENTS.md as the source of truth.";
  return "Consider adding AGENTS.md as the shared canonical instruction file.";
}
