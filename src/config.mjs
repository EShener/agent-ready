import path from "node:path";
import { pathExists, readJsonIfExists } from "./fs-utils.mjs";

export async function loadConfig(root, options = {}) {
  const configPath = options.configPath
    ? path.resolve(root, options.configPath)
    : path.join(root, "agent-ready.json");

  if (!await pathExists(configPath)) {
    return {
      file: "",
      targets: [],
      commands: {},
      docs: {},
    };
  }

  const config = await readJsonIfExists(configPath);
  validateConfig(config, configPath);
  return {
    file: path.relative(root, configPath) || "agent-ready.json",
    targets: Array.isArray(config.targets) ? config.targets : [],
    commands: isPlainObject(config.commands) ? config.commands : {},
    docs: isPlainObject(config.docs) ? config.docs : {},
  };
}

function validateConfig(config, configPath) {
  if (!isPlainObject(config)) throw new Error(`${configPath} must contain a JSON object.`);
  if (config.targets !== undefined && !Array.isArray(config.targets)) {
    throw new Error(`${configPath}: targets must be an array.`);
  }
  if (config.commands !== undefined && !isPlainObject(config.commands)) {
    throw new Error(`${configPath}: commands must be an object.`);
  }
  if (config.docs !== undefined && !isPlainObject(config.docs)) {
    throw new Error(`${configPath}: docs must be an object.`);
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
