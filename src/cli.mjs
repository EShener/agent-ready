import { scanRepo } from "./scanner.mjs";
import { benchmarkRepos } from "./benchmark.mjs";
import { buildShareComment } from "./comment.mjs";
import { compareReadinessFiles } from "./compare.mjs";
import { explainRepo } from "./explainer.mjs";
import { parseTargets, writeGeneratedArtifacts } from "./generator.mjs";
import { improveRepo } from "./improver.mjs";
import { promptInitOptions } from "./interactive.mjs";
import { lintRepo, scoreRepo } from "./linter.mjs";
import { buildAgentMatrix } from "./matrix.mjs";
import { renderAgentMatrix, renderAnnotations, renderBadge, renderBenchmarkReport, renderComparison, renderDoctor, renderExplanation, renderFindings, renderImprovement, renderImprovementIssue, renderMarkdownReport, renderScanSummary, renderScore, renderShareComment } from "./reporter.mjs";
import { renderCiWorkflow, writeCiWorkflow } from "./workflow.mjs";

const HELP = `agent-ready

Make any repository ready for AI coding agents in 60 seconds.

Usage:
  agent-ready scan [--root PATH] [--config PATH] [--format json|text]
  agent-ready init [--root PATH] [--config PATH] [--targets codex,claude,cursor,gemini,copilot] [--dry-run] [--force] [--interactive]
  agent-ready fix [--root PATH] [--config PATH] [--targets codex,claude,cursor,gemini,copilot] [--level basic|team|full] [--dry-run] [--force] [--no-ci] [--mode action|npx] [--fail-under N]
  agent-ready improve [--root PATH] [--config PATH] [--targets codex,claude,cursor,gemini,copilot] [--level basic|team|full] [--format markdown|issue|json] [--dry-run] [--force] [--no-ci] [--mode action|npx] [--fail-under N] [--comment]
  agent-ready lint [--root PATH] [--config PATH] [--format json|text]
  agent-ready annotations [--root PATH] [--config PATH] [--format github|json]
  agent-ready score [--root PATH] [--config PATH] [--format json|text] [--fail-under N]
  agent-ready explain [--root PATH] [--config PATH] [--format markdown|json]
  agent-ready matrix [--root PATH] [--config PATH] [--format markdown|json]
  agent-ready comment [--root PATH] [--config PATH] [--format markdown|json] [--max-fixes N]
  agent-ready compare --before before.json --after after.json [--format markdown|json]
  agent-ready doctor [--root PATH] [--config PATH] [--format json|text] [--fail-under N]
  agent-ready report [--root PATH] [--config PATH] [--format markdown|json]
  agent-ready badge [--root PATH] [--config PATH] [--format markdown|url|json] [--fail-under N]
  agent-ready benchmark [PATH...] [--root PATH] [--config PATH] [--format markdown|json]
  agent-ready ci [--mode action|npx] [--fail-under N] [--comment] [--write] [--dry-run] [--force] [--output PATH]

Examples:
  npx agent-ready scan
  npx agent-ready init --targets codex,claude,cursor
  npx agent-ready fix --dry-run
  npx agent-ready fix --level team --dry-run
  npx agent-ready improve --dry-run
  npx agent-ready improve --level team
  npx agent-ready init --interactive
  npx agent-ready doctor
  npx agent-ready explain
  npx agent-ready matrix
  npx agent-ready comment
  npx agent-ready compare --before before.json --after after.json
  npx agent-ready annotations
  npx agent-ready score --fail-under 80
  npx agent-ready ci
  npx agent-ready ci --write
  npx agent-ready ci --comment
  npx agent-ready report --format markdown
  npx agent-ready benchmark ../repo-a ../repo-b
`;

export async function runCli(argv) {
  const { command, args, flags } = parseCli(argv);
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

  if (command === "fix") {
    const profile = await scanRepo(root, scanOptions);
    const targets = parseTargets(flags.targets || profile.config.targets.join(","));
    const results = await writeGeneratedArtifacts(profile, {
      targets,
      level: flags.level || "basic",
      dryRun: Boolean(flags["dry-run"]),
      force: Boolean(flags.force),
    });

    for (const result of results) {
      console.log(`${result.action}: ${result.file}`);
    }

    if (!flags["no-ci"]) {
      const ciResult = await writeCiWorkflow({
        root,
        failUnder: flags["fail-under"] ?? "80",
        mode: flags.mode || "action",
        dryRun: Boolean(flags["dry-run"]),
        force: Boolean(flags.force),
      });
      console.log(`${ciResult.action}: ${ciResult.file}`);
    }
    return;
  }

  if (command === "improve") {
    const profile = await scanRepo(root, scanOptions);
    const improvement = await improveRepo({
      root,
      configPath: scanOptions.configPath,
      targets: parseTargets(flags.targets || profile.config.targets.join(",")),
      level: flags.level || "basic",
      dryRun: Boolean(flags["dry-run"]),
      force: Boolean(flags.force),
      noCi: Boolean(flags["no-ci"]),
      mode: flags.mode || "action",
      failUnder: flags["fail-under"] ?? "80",
      comment: Boolean(flags.comment),
    });

    if (flags.format === "json" || flags.json) {
      console.log(JSON.stringify(improvement, null, 2));
    } else {
      if (flags.format && !["markdown", "issue"].includes(flags.format)) throw new Error("Improve format must be markdown, issue, or json.");
      console.log(flags.format === "issue" ? renderImprovementIssue(improvement) : renderImprovement(improvement));
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

  if (command === "explain") {
    const profile = await scanRepo(root, scanOptions);
    const findings = await lintRepo(profile);
    const score = scoreRepo(profile, findings);
    const explanation = explainRepo(profile, findings, score);
    if (flags.format === "json" || flags.json) {
      console.log(JSON.stringify(explanation, null, 2));
    } else {
      if (flags.format && flags.format !== "markdown") throw new Error("Explain format must be markdown or json.");
      console.log(renderExplanation(explanation));
    }
    return;
  }

  if (command === "matrix") {
    const profile = await scanRepo(root, scanOptions);
    const matrix = buildAgentMatrix(profile);
    if (flags.format === "json" || flags.json) {
      console.log(JSON.stringify(matrix, null, 2));
    } else {
      if (flags.format && flags.format !== "markdown") throw new Error("Matrix format must be markdown or json.");
      console.log(renderAgentMatrix(matrix));
    }
    return;
  }

  if (command === "comment") {
    const profile = await scanRepo(root, scanOptions);
    const findings = await lintRepo(profile);
    const score = scoreRepo(profile, findings);
    const matrix = buildAgentMatrix(profile);
    const explanation = explainRepo(profile, findings, score);
    const comment = buildShareComment(profile, findings, score, matrix, explanation, {
      maxFixes: flags["max-fixes"],
    });
    if (flags.format === "json" || flags.json) {
      console.log(JSON.stringify(comment, null, 2));
    } else {
      if (flags.format && flags.format !== "markdown") throw new Error("Comment format must be markdown or json.");
      console.log(renderShareComment(comment));
    }
    return;
  }

  if (command === "compare") {
    const comparison = await compareReadinessFiles(flags.before, flags.after);
    if (flags.format === "json" || flags.json) {
      console.log(JSON.stringify(comparison, null, 2));
    } else {
      if (flags.format && flags.format !== "markdown") throw new Error("Compare format must be markdown or json.");
      console.log(renderComparison(comparison));
    }
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

  if (command === "benchmark") {
    const benchmark = await benchmarkRepos(args, {
      root,
      configPath: scanOptions.configPath,
    });
    if (flags.format === "json" || flags.json) {
      console.log(JSON.stringify(benchmark, null, 2));
    } else {
      if (flags.format && flags.format !== "markdown") throw new Error("Benchmark format must be markdown or json.");
      console.log(renderBenchmarkReport(benchmark));
    }
    return;
  }

  if (command === "ci") {
    const options = {
      failUnder: flags["fail-under"] ?? "80",
      mode: flags.mode || "action",
      comment: Boolean(flags.comment),
    };
    if (flags.write) {
      const result = await writeCiWorkflow({
        ...options,
        root,
        output: typeof flags.output === "string" ? flags.output : undefined,
        dryRun: Boolean(flags["dry-run"]),
        force: Boolean(flags.force),
      });
      console.log(`${result.action}: ${result.file}`);
      return;
    }
    console.log(renderCiWorkflow(options));
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
