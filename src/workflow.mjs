import path from "node:path";
import { pathExists, toPosix, writeText } from "./fs-utils.mjs";

const DEFAULT_WORKFLOW_PATH = ".github/workflows/agent-ready.yml";

export function renderCiWorkflow(options = {}) {
  const failUnder = normalizeFailUnder(options.failUnder ?? "80");
  const mode = options.mode || "action";
  const comment = Boolean(options.comment);
  if (comment && mode !== "action") throw new Error("--comment requires --mode action.");
  if (mode === "npx") return renderNpxWorkflow(failUnder);
  if (mode === "action") return renderActionWorkflow(failUnder, { comment });
  throw new Error("--mode must be action or npx.");
}

export async function writeCiWorkflow(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const output = options.output || DEFAULT_WORKFLOW_PATH;
  const absoluteOutput = path.isAbsolute(output) ? output : path.join(root, output);
  const relativeOutput = toPosix(path.relative(root, absoluteOutput)) || DEFAULT_WORKFLOW_PATH;

  if (await pathExists(absoluteOutput) && !options.force) {
    return { action: "skipped", file: relativeOutput };
  }

  if (options.dryRun) {
    return { action: "planned", file: relativeOutput };
  }

  const content = renderCiWorkflow({
    failUnder: options.failUnder ?? "80",
    mode: options.mode || "action",
    comment: Boolean(options.comment),
  });
  await writeText(absoluteOutput, content);
  return { action: "written", file: relativeOutput };
}

function renderActionWorkflow(failUnder, options = {}) {
  const permissions = options.comment
    ? `
permissions:
  contents: read
  pull-requests: write
  issues: write
`
    : "";
  const commentInput = options.comment ? "          comment: true\n" : "";
  return `name: Agent Ready

on:
  pull_request:
  push:
    branches: [main]
${permissions}

jobs:
  agent-ready:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: EShener/agent-ready@v0.1.18
        with:
          fail-under: ${failUnder}
${commentInput}`;
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
