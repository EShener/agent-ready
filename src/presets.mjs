const PRESETS = {
  oss: {
    name: "oss",
    description: "Open-source baseline with canonical agent docs and team collaboration starters.",
    targets: ["codex", "claude", "cursor", "gemini", "copilot"],
    level: "team",
    ci: true,
    comment: false,
  },
  team: {
    name: "team",
    description: "Team baseline with collaboration docs, CI, and pull request readiness comments.",
    targets: ["codex", "claude", "cursor", "gemini", "copilot"],
    level: "team",
    ci: true,
    comment: true,
  },
  enterprise: {
    name: "enterprise",
    description: "Full governance baseline with ownership, security, CI, and pull request comments.",
    targets: ["codex", "claude", "cursor", "gemini", "copilot"],
    level: "full",
    ci: true,
    comment: true,
  },
};

export function presetNames() {
  return Object.keys(PRESETS);
}

export function resolvePreset(value) {
  if (!value) return null;
  if (value === true) throw new Error(`--preset must be one of: ${presetNames().join(", ")}.`);

  const key = String(value).trim().toLowerCase();
  const preset = PRESETS[key];
  if (!preset) throw new Error(`--preset must be one of: ${presetNames().join(", ")}.`);

  return {
    ...preset,
    targets: [...preset.targets],
  };
}
