export function renderCiWorkflow(options = {}) {
  const failUnder = normalizeFailUnder(options.failUnder ?? "80");
  const mode = options.mode || "action";
  if (mode === "npx") return renderNpxWorkflow(failUnder);
  if (mode === "action") return renderActionWorkflow(failUnder);
  throw new Error("--mode must be action or npx.");
}

function renderActionWorkflow(failUnder) {
  return `name: Agent Ready

on:
  pull_request:
  push:
    branches: [main]

jobs:
  agent-ready:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: EShener/agent-ready@v0.1.4
        with:
          fail-under: ${failUnder}
`;
}

function renderNpxWorkflow(failUnder) {
  return `name: Agent Ready

on:
  pull_request:
  push:
    branches: [main]

jobs:
  agent-ready:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx agent-ready score --fail-under ${failUnder}
`;
}

function normalizeFailUnder(value) {
  const failUnder = Number(value);
  if (!Number.isFinite(failUnder) || failUnder < 0 || failUnder > 100) {
    throw new Error("--fail-under must be a number between 0 and 100.");
  }
  return String(Math.trunc(failUnder));
}
