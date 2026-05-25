export function buildExamplesCatalog() {
  return {
    schemaVersion: 1,
    examples: [
      {
        id: "single-repo-improvement",
        title: "Single repository improvement",
        file: "docs/examples/single-repo-improvement.md",
        command: "npx --yes @eshen_fox_mie/agent-ready improve --preset team --dry-run",
        useCase: "Show the before/after score and planned files before writing anything.",
      },
      {
        id: "issue-checklist",
        title: "GitHub issue checklist",
        file: "docs/examples/issue-checklist.md",
        command: "npx --yes @eshen_fox_mie/agent-ready improve --preset team --dry-run --format issue",
        useCase: "Turn readiness gaps into a contributor-friendly GitHub issue body.",
      },
      {
        id: "snapshot",
        title: "Static readiness snapshot",
        file: "docs/examples/snapshot.md",
        command: "npx --yes @eshen_fox_mie/agent-ready snapshot",
        useCase: "Create a complete AGENT_READINESS.md report for a repository.",
      },
      {
        id: "multi-repo-roadmap",
        title: "Multi-repository roadmap",
        file: "docs/examples/multi-repo-roadmap.md",
        command: "npx --yes @eshen_fox_mie/agent-ready roadmap ../repo-a ../repo-b",
        useCase: "Group repeated readiness gaps into a phased team cleanup plan.",
      },
    ],
  };
}
