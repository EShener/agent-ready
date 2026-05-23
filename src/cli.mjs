import { scanRepo } from "./scanner.mjs";
import { parseTargets, writeGeneratedArtifacts } from "./generator.mjs";
import { promptInitOptions } from "./interactive.mjs";
import { lintRepo, scoreRepo } from "./linter.mjs";
import { renderAnnotations, renderBadge, renderDoctor, renderFindings, renderMarkdownReport, renderScanSummary, renderScore } from "./reporter.mjs";
import { renderCiWorkflow } from "./workflow.mjs";

const HELP = `agent-ready

Make any repository ready for AI coding agents in 60 seconds.

Usage:
  agent-ready scan [--root PATH] [--config PATH] [--format json|text]
  agent-ready init [--root PATH] [--config PATH] [--targets codex,claude,cursor,gemini,copilot] [--dry-run] [--force] [--interactive]
  agent-ready lint [--root PATH] [--config PATH] [--format json|text]
  agent-ready annotations [--root PATH] [--config PATH] [--format github|json]
  agent-ready score [--root PATH] [--config PATH] [--format json|text] [--fail-under N]
  agent-ready doctor [--root PATH] [--config PATH] [--format json|text] [--fail-under N]
  agent-ready report [--root PATH] [--config PATH] [--format markdown|json]
  agent-ready badge [--root PATH] [--config PATH] [--format markdown|url|json] [--fail-under N]
  agent-ready ci [--mode action|npx] [--fail-under N]

Examples:
  npx agent-ready scan
  npx agent-ready init --targets codex,claude,cursor
  npx agent-ready init --interactive
  npx agent-ready doctor
  npx agent-ready annotations
  npx agent-ready score --fail-under 80
  npx agent-ready ci
  npx agent-ready report --format markdown
`;

export async function runCli(argv) {
  const { command, flags } = parseCli(argv);
  if (!command || flags.help) {
    console.log(HELP);
    return;
  }

  const root = flags.root || process.cwd();
  const scanOptions = { configPath: typeof flags.config === "string" ? flags.config : undefined };
  if (command === "scan") {
    const profile = await scanRepo(root, scanOptions);
    if (flags.format === "json" || flags.json) console.log(JSON.stringify(profile, null, 2));
    else console.log(renderScanSummary(profile));
    return;
  }

  if (command === "init") {
    const profile = await scanRepo(root, scanOptions);
    const initOptions = flags.interactive
      ? await promptInitOptions(profile, flags)
      : {
          targets: parseTargets(flags.targets || profile.config.targets.join(",")),
          dryRun: Boolean(flags["dry-run"]),
          force: Boolean(flags.force),
        };
    const results = await writeGeneratedArtifacts(profile, {
      targets: initOptions.targets,
      dryRun: initOptions.dryRun,
      force: initOptions.force,
    });
    for (const result of results) {
      console.log(`${result.action}: ${result.file}`);
    }
    return;
  }

  if (command === "lint") {
    const profile = await scanRepo(root, scanOptions);
    const findings = await lintRepo(profile);
    if (flags.format === "json" || flags.json) console.log(JSON.stringify({ findings }, null, 2));
    else console.log(renderFindings(findings));
    if (findings.some((finding) => finding.severity === "error")) process.exitCode = 1;
    return;
  }

  if (command === "annotations" || command === "annotate") {
    const profile = await scanRepo(root, scanOptions);
    const findings = await lintRepo(profile);
    if (flags.format === "json" || flags.json) {
      console.log(JSON.stringify({ findings }, null, 2));
    } else {
      if (flags.format && flags.format !== "github") throw new Error("Annotations format must be github or json.");
      console.log(renderAnnotations(findings));
    }
    return;
  }

  if (command === "score") {
    const profile = await scanRepo(root, scanOptions);
    const findings = await lintRepo(profile);
    const score = scoreRepo(profile, findings);
    if (flags.format === "json" || flags.json) console.log(JSON.stringify(score, null, 2));
    else console.log(renderScore(score));
    applyFailUnder(score, flags["fail-under"]);
    return;
  }

  if (command === "doctor") {
    const profile = await scanRepo(root, scanOptions);
    const findings = await lintRepo(profile);
    const score = scoreRepo(profile, findings);
    if (flags.format === "json" || flags.json) console.log(JSON.stringify({ profile, findings, score }, null, 2));
    else console.log(renderDoctor(profile, findings, score));
    applyFailUnder(score, flags["fail-under"]);
    return;
  }

  if (command === "report") {
    const profile = await scanRepo(root, scanOptions);
    const findings = await lintRepo(profile);
    const score = scoreRepo(profile, findings);
    if (flags.format === "json" || flags.json) console.log(JSON.stringify({ profile, findings, score }, null, 2));
    else console.log(renderMarkdownReport(profile, findings, score));
    return;
  }

  if (command === "badge") {
    const profile = await scanRepo(root, scanOptions);
    const findings = await lintRepo(profile);
    const score = scoreRepo(profile, findings);
    console.log(renderBadge(score, flags.format || "markdown"));
    applyFailUnder(score, flags["fail-under"]);
    return;
  }

  if (command === "ci") {
    console.log(renderCiWorkflow({
      failUnder: flags["fail-under"] ?? "80",
      mode: flags.mode || "action",
    }));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

function applyFailUnder(score, failUnder) {
  if (failUnder === undefined || failUnder === true) return;
  const threshold = Number(failUnder);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
    throw new Error("--fail-under must be a number between 0 and 100.");
  }
  if (score.score < threshold) process.exitCode = 1;
}

export function parseCli(argv) {
  const flags = {};
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      flags.help = true;
      continue;
    }
    if (token === "--json") {
      flags.json = true;
      continue;
    }
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) {
        flags[key] = true;
      } else {
        flags[key] = next;
        index += 1;
      }
      continue;
    }
    positional.push(token);
  }
  return { command: positional[0], args: positional.slice(1), flags };
}
