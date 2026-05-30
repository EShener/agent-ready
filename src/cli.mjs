import { scanRepo } from "./scanner.mjs";
import { benchmarkRepos } from "./benchmark.mjs";
import { buildShareComment } from "./comment.mjs";
import { compareReadinessFiles } from "./compare.mjs";
import { buildExamplesCatalog } from "./examples.mjs";
import { explainRepo } from "./explainer.mjs";
import { parseFixLevel, parseTargets, writeGeneratedArtifacts } from "./generator.mjs";
import { improveRepo } from "./improver.mjs";
import { promptInitOptions } from "./interactive.mjs";
import { lintRepo, scoreRepo } from "./linter.mjs";
import { buildAgentMatrix } from "./matrix.mjs";
import { buildOutreachFromFlags, renderOutreach } from "./outreach.mjs";
import { resolvePreset } from "./presets.mjs";
import { renderAgentMatrix, renderAnnotations, renderBadge, renderBenchmarkReport, renderComparison, renderDoctor, renderExamplesCatalog, renderExplanation, renderFindings, renderImprovement, renderImprovementIssue, renderLeaderboard, renderMarkdownReport, renderRoadmap, renderScanSummary, renderScore, renderShareComment, renderSnapshot } from "./reporter.mjs";
import { snapshotRepo, writeSnapshotFile } from "./snapshot.mjs";
import { renderCiWorkflow, writeCiWorkflow } from "./workflow.mjs";

const HELP = `agent-ready

Make any repository ready for AI coding agents in 60 seconds.

Usage:
  agent-ready scan [--root PATH] [--config PATH] [--format json|text]
  agent-ready init [--root PATH] [--config PATH] [--preset oss|team|enterprise] [--targets codex,claude,cursor,gemini,copilot] [--level basic|team|full] [--dry-run] [--force] [--interactive]
  agent-ready fix [--root PATH] [--config PATH] [--preset oss|team|enterprise] [--targets codex,claude,cursor,gemini,copilot] [--level basic|team|full] [--dry-run] [--force] [--no-ci] [--mode action|npx] [--fail-under N] [--comment]
  agent-ready improve [--root PATH] [--config PATH] [--preset oss|team|enterprise] [--targets codex,claude,cursor,gemini,copilot] [--level basic|team|full] [--format markdown|issue|json] [--dry-run] [--force] [--no-ci] [--mode action|npx] [--fail-under N] [--comment]
  agent-ready lint [--root PATH] [--config PATH] [--format json|text]
  agent-ready annotations [--root PATH] [--config PATH] [--format github|json]
  agent-ready score [--root PATH] [--config PATH] [--format json|text] [--fail-under N]
  agent-ready examples [--format markdown|json]
  agent-ready explain [--root PATH] [--config PATH] [--format markdown|json]
  agent-ready matrix [--root PATH] [--config PATH] [--format markdown|json]
  agent-ready comment [--root PATH] [--config PATH] [--format markdown|json] [--max-fixes N]
  agent-ready outreach [--root PATH] [--config PATH] [--format markdown|json] [--preset team] [--targets codex,claude,cursor,gemini,copilot] [--level team] [--mode npx|action] [--fail-under N]
  agent-ready compare --before before.json --after after.json [--format markdown|json]
  agent-ready doctor [--root PATH] [--config PATH] [--format json|text] [--fail-under N]
  agent-ready report [--root PATH] [--config PATH] [--format markdown|json]
  agent-ready snapshot [--root PATH] [--config PATH] [--format markdown|json] [--write] [--dry-run] [--force] [--output PATH]
  agent-ready badge [--root PATH] [--config PATH] [--format markdown|url|json] [--fail-under N]
  agent-ready benchmark [PATH...] [--root PATH] [--config PATH] [--format markdown|json]
  agent-ready leaderboard [PATH...] [--root PATH] [--config PATH] [--format markdown|json]
  agent-ready roadmap [PATH...] [--root PATH] [--config PATH] [--format markdown|json]
  agent-ready ci [--mode action|npx] [--fail-under N] [--comment] [--write] [--dry-run] [--force] [--output PATH]

Examples:
  npx @eshen_fox_mie/agent-ready scan
  npx @eshen_fox_mie/agent-ready init --targets codex,claude,cursor
  npx @eshen_fox_mie/agent-ready init --preset oss --dry-run
  npx @eshen_fox_mie/agent-ready fix --dry-run
  npx @eshen_fox_mie/agent-ready fix --preset team --dry-run
  npx @eshen_fox_mie/agent-ready fix --level team --dry-run
  npx @eshen_fox_mie/agent-ready improve --dry-run
  npx @eshen_fox_mie/agent-ready improve --preset team --dry-run
  npx @eshen_fox_mie/agent-ready improve --level team
  npx @eshen_fox_mie/agent-ready init --interactive
  npx @eshen_fox_mie/agent-ready doctor
  npx @eshen_fox_mie/agent-ready examples
  npx @eshen_fox_mie/agent-ready explain
  npx @eshen_fox_mie/agent-ready matrix
  npx @eshen_fox_mie/agent-ready comment
  npx @eshen_fox_mie/agent-ready outreach
  npx @eshen_fox_mie/agent-ready compare --before before.json --after after.json
  npx @eshen_fox_mie/agent-ready annotations
  npx @eshen_fox_mie/agent-ready score --fail-under 80
  npx @eshen_fox_mie/agent-ready ci
  npx @eshen_fox_mie/agent-ready ci --write
  npx @eshen_fox_mie/agent-ready ci --comment
  npx @eshen_fox_mie/agent-ready report --format markdown
  npx @eshen_fox_mie/agent-ready snapshot --write
  npx @eshen_fox_mie/agent-ready benchmark ../repo-a ../repo-b
  npx @eshen_fox_mie/agent-ready leaderboard ../repo-a ../repo-b
  npx @eshen_fox_mie/agent-ready roadmap ../repo-a ../repo-b
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
    const preset = resolvePreset(flags.preset);
    const initOptions = flags.interactive
      ? await promptInitOptions(profile, flags)
      : {
          targets: parseTargets(flags.targets || preset?.targets.join(",") || profile.config.targets.join(",")),
          level: flags.level || preset?.level,
          dryRun: Boolean(flags["dry-run"]),
          force: Boolean(flags.force),
        };
    const level = initOptions.level || preset?.level ? parseFixLevel(initOptions.level || preset?.level) : undefined;
    const results = await writeGeneratedArtifacts(profile, {
      targets: initOptions.targets,
      level,
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
    const preset = resolvePreset(flags.preset);
    const mode = flags.mode || "action";
    const targets = parseTargets(flags.targets || preset?.targets.join(",") || profile.config.targets.join(","));
    const level = parseFixLevel(flags.level || preset?.level || "basic");
    const writeCi = shouldWriteCi(flags, preset);
    const comment = shouldComment(flags, preset, mode);
    const results = await writeGeneratedArtifacts(profile, {
      targets,
      level,
      dryRun: Boolean(flags["dry-run"]),
      force: Boolean(flags.force),
    });

    for (const result of results) {
      console.log(`${result.action}: ${result.file}`);
    }

    if (writeCi) {
      const ciResult = await writeCiWorkflow({
        root,
        failUnder: flags["fail-under"] ?? "80",
        mode,
        comment,
        dryRun: Boolean(flags["dry-run"]),
        force: Boolean(flags.force),
      });
      console.log(`${ciResult.action}: ${ciResult.file}`);
    }
    return;
  }

  if (command === "improve") {
    const profile = await scanRepo(root, scanOptions);
    const preset = resolvePreset(flags.preset);
    const mode = flags.mode || "action";
    const level = parseFixLevel(flags.level || preset?.level || "basic");
    const noCi = !shouldWriteCi(flags, preset);
    const comment = shouldComment(flags, preset, mode);
    const improvement = await improveRepo({
      root,
      configPath: scanOptions.configPath,
      preset: preset?.name,
      targets: parseTargets(flags.targets || preset?.targets.join(",") || profile.config.targets.join(",")),
      level,
      dryRun: Boolean(flags["dry-run"]),
      force: Boolean(flags.force),
      noCi,
      mode,
      failUnder: flags["fail-under"] ?? "80",
      comment,
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

  if (command === "examples") {
    const catalog = buildExamplesCatalog();
    if (flags.format === "json" || flags.json) {
      console.log(JSON.stringify(catalog, null, 2));
    } else {
      if (flags.format && flags.format !== "markdown") throw new Error("Examples format must be markdown or json.");
      console.log(renderExamplesCatalog(catalog));
    }
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

  if (command === "outreach") {
    const outreach = await buildOutreachFromFlags(root, scanOptions, flags);
    if (flags.format === "json" || flags.json) {
      console.log(JSON.stringify(outreach, null, 2));
    } else {
      if (flags.format && flags.format !== "markdown") throw new Error("Outreach format must be markdown or json.");
      console.log(renderOutreach(outreach));
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

  if (command === "snapshot") {
    const snapshot = await snapshotRepo(root, scanOptions);
    if (flags.format === "json" || flags.json) {
      console.log(JSON.stringify(snapshot, null, 2));
      return;
    }
    if (flags.format && flags.format !== "markdown") throw new Error("Snapshot format must be markdown or json.");
    const content = renderSnapshot(snapshot);
    if (flags.write) {
      const result = await writeSnapshotFile(snapshot, content, {
        root,
        output: typeof flags.output === "string" ? flags.output : undefined,
        dryRun: Boolean(flags["dry-run"]),
        force: Boolean(flags.force),
      });
      console.log(`${result.action}: ${result.file}`);
    } else {
      console.log(content);
    }
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

  if (command === "leaderboard") {
    const benchmark = await benchmarkRepos(args, {
      root,
      configPath: scanOptions.configPath,
    });
    if (flags.format === "json" || flags.json) {
      console.log(JSON.stringify(benchmark, null, 2));
    } else {
      if (flags.format && flags.format !== "markdown") throw new Error("Leaderboard format must be markdown or json.");
      console.log(renderLeaderboard(benchmark));
    }
    return;
  }

  if (command === "roadmap") {
    const benchmark = await benchmarkRepos(args, {
      root,
      configPath: scanOptions.configPath,
    });
    if (flags.format === "json" || flags.json) {
      console.log(JSON.stringify(benchmark, null, 2));
    } else {
      if (flags.format && flags.format !== "markdown") throw new Error("Roadmap format must be markdown or json.");
      console.log(renderRoadmap(benchmark));
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

function shouldWriteCi(flags, preset) {
  if (hasFlag(flags, "no-ci")) return !parseBooleanFlag(flags["no-ci"]);
  if (preset) return Boolean(preset.ci);
  return true;
}

function shouldComment(flags, preset, mode) {
  const explicit = hasFlag(flags, "comment");
  const comment = explicit ? parseBooleanFlag(flags.comment) : Boolean(preset?.comment);
  if (comment && mode === "npx" && !explicit) return false;
  return comment;
}

function parseBooleanFlag(value) {
  if (value === undefined || value === true) return true;
  if (value === false) return false;
  const normalized = String(value).trim().toLowerCase();
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  return Boolean(value);
}

function hasFlag(flags, key) {
  return Object.prototype.hasOwnProperty.call(flags, key);
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
