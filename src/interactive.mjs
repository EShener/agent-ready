import { stdin as input, stdout as output } from "node:process";
import readline from "node:readline/promises";
import { parseTargets } from "./generator.mjs";

export async function promptInitOptions(profile, flags = {}) {
  const defaults = profile.config.targets.length ? profile.config.targets : ["codex", "claude", "cursor", "gemini", "copilot"];
  const prompt = await createPrompt();
  try {
    output.write(`agent-ready init: ${profile.name}\n`);
    output.write(`Detected commands: ${formatCommands(profile.commands)}\n`);
    output.write(`Existing agent docs: ${profile.agentDocs.map((doc) => doc.file).join(", ") || "none"}\n\n`);

    const targetsAnswer = await prompt.ask(`Targets [${defaults.join(",")}]: `);
    const targets = parseTargets(targetsAnswer.trim() || defaults.join(","));

    const writeAnswer = await prompt.ask("Write files now? [y/N]: ");
    const dryRun = !isYes(writeAnswer);

    let force = Boolean(flags.force);
    if (!dryRun && profile.agentDocs.length && !force) {
      const forceAnswer = await prompt.ask("Overwrite existing agent files if needed? [y/N]: ");
      force = isYes(forceAnswer);
    }

    return { targets, dryRun, force };
  } finally {
    prompt.close();
  }
}

async function createPrompt() {
  if (input.isTTY) {
    const rl = readline.createInterface({ input, output });
    return {
      ask: (question) => rl.question(question),
      close: () => rl.close(),
    };
  }

  const chunks = [];
  for await (const chunk of input) chunks.push(String(chunk));
  const answers = chunks.join("").split(/\r?\n/);
  let index = 0;
  return {
    ask: async (question) => {
      output.write(question);
      return answers[index++] ?? "";
    },
    close: () => {},
  };
}

function formatCommands(commands) {
  const entries = Object.entries(commands).filter(([, value]) => value);
  if (!entries.length) return "none";
  return entries.map(([key, value]) => `${key}=${value}`).join("; ");
}

function isYes(value) {
  return /^(y|yes)$/i.test(String(value).trim());
}
