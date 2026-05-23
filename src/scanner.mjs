import path from "node:path";
import { loadConfig } from "./config.mjs";
import { listDirSafe, pathExists, readJsonIfExists, readTextIfExists, topLevelEntries, unique, walkFiles } from "./fs-utils.mjs";

const LANGUAGE_BY_EXTENSION = new Map([
  [".js", "JavaScript"],
  [".jsx", "JavaScript"],
  [".mjs", "JavaScript"],
  [".cjs", "JavaScript"],
  [".ts", "TypeScript"],
  [".tsx", "TypeScript"],
  [".mts", "TypeScript"],
  [".cts", "TypeScript"],
  [".py", "Python"],
  [".rs", "Rust"],
  [".go", "Go"],
  [".java", "Java"],
  [".kt", "Kotlin"],
  [".swift", "Swift"],
  [".rb", "Ruby"],
  [".php", "PHP"],
]);

export async function scanRepo(root = process.cwd(), options = {}) {
  const absoluteRoot = path.resolve(root);
  const config = await loadConfig(absoluteRoot, { configPath: options.configPath });
  const [
    packageJson,
    pyproject,
    cargoToml,
    goMod,
    readmeText,
    files,
    structure,
  ] = await Promise.all([
    readJsonIfExists(path.join(absoluteRoot, "package.json")),
    readTextIfExists(path.join(absoluteRoot, "pyproject.toml")),
    readTextIfExists(path.join(absoluteRoot, "Cargo.toml")),
    readTextIfExists(path.join(absoluteRoot, "go.mod")),
    readTextIfExists(path.join(absoluteRoot, "README.md")),
    walkFiles(absoluteRoot),
    topLevelEntries(absoluteRoot),
  ]);

  const languageCounts = countLanguages(files);
  const packageManager = await detectPackageManager(absoluteRoot);
  const detectedCommands = await detectCommands({
    root: absoluteRoot,
    packageJson,
    packageManager,
    pyproject,
    cargoToml,
    goMod,
    files,
  });
  const commands = mergeCommands(detectedCommands, config.commands);
  const agentDocs = await detectAgentDocs(absoluteRoot);
  const ci = await detectCi(absoluteRoot);
  const detectedAdrDirectory = files.some((file) => /^docs\/adr\//.test(file)) ? "docs/adr" : "";
  const docs = {
    readme: Boolean(readmeText),
    architecture: config.docs.architecture || files.find((file) => /(^|\/)(architecture|ARCHITECTURE)\.md$/.test(file)) || "",
    adrDirectory: config.docs.decisions || config.docs.adrDirectory || detectedAdrDirectory,
  };

  return {
    schemaVersion: 1,
    root: absoluteRoot,
    name: detectName({ packageJson, pyproject, cargoToml, goMod, root: absoluteRoot }),
    languages: languageCounts,
    primaryLanguage: languageCounts[0]?.name || "Unknown",
    frameworks: detectFrameworks({ packageJson, pyproject, cargoToml, goMod, files }),
    packageManager,
    commands,
    ci,
    docs,
    agentDocs,
    config,
    structure,
    filesSample: files.slice(0, 80),
    scannedAt: new Date().toISOString(),
  };
}

function mergeCommands(detected, configured) {
  const commands = { ...detected };
  for (const [name, value] of Object.entries(configured || {})) {
    if (typeof value === "string" && value.trim()) commands[name] = value.trim();
  }
  return commands;
}

function countLanguages(files) {
  const counts = new Map();
  for (const file of files) {
    const ext = path.extname(file);
    const language = LANGUAGE_BY_EXTENSION.get(ext);
    if (!language) continue;
    counts.set(language, (counts.get(language) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, files]) => ({ name, files }))
    .sort((a, b) => b.files - a.files || a.name.localeCompare(b.name));
}

async function detectPackageManager(root) {
  const checks = [
    ["pnpm", "pnpm-lock.yaml"],
    ["yarn", "yarn.lock"],
    ["bun", "bun.lockb"],
    ["bun", "bun.lock"],
    ["npm", "package-lock.json"],
  ];
  for (const [name, file] of checks) {
    if (await pathExists(path.join(root, file))) return name;
  }
  if (await pathExists(path.join(root, "package.json"))) return "npm";
  if (await pathExists(path.join(root, "pyproject.toml"))) return "python";
  if (await pathExists(path.join(root, "Cargo.toml"))) return "cargo";
  if (await pathExists(path.join(root, "go.mod"))) return "go";
  return "unknown";
}

async function detectCommands({ root, packageJson, packageManager, pyproject, cargoToml, goMod, files }) {
  const commands = {};
  const scripts = packageJson?.scripts || {};

  if (packageJson) {
    commands.install = installCommand(packageManager);
    if (scripts.dev) commands.dev = runScriptCommand(packageManager, "dev");
    if (scripts.start) commands.start = runScriptCommand(packageManager, "start");
    if (scripts.build) commands.build = runScriptCommand(packageManager, "build");
    if (scripts.test) commands.test = runScriptCommand(packageManager, "test");
    if (scripts.lint) commands.lint = runScriptCommand(packageManager, "lint");
    if (scripts.format) commands.format = runScriptCommand(packageManager, "format");
  }

  if (pyproject || files.includes("requirements.txt") || files.includes("setup.py")) {
    commands.install ||= pyproject ? "python3 -m pip install -e ." : "python3 -m pip install -r requirements.txt";
    if (hasPythonTool(pyproject, "pytest") || files.some((file) => /^tests?\//.test(file))) {
      commands.test ||= "python3 -m pytest";
    }
    if (hasPythonTool(pyproject, "ruff")) {
      commands.lint ||= "python3 -m ruff check .";
      commands.format ||= "python3 -m ruff format .";
    }
  }

  if (cargoToml) {
    commands.build ||= "cargo build";
    commands.test ||= "cargo test";
    commands.lint ||= "cargo clippy --all-targets --all-features";
    commands.format ||= "cargo fmt";
  }

  if (goMod) {
    commands.build ||= "go build ./...";
    commands.test ||= "go test ./...";
    commands.lint ||= "go vet ./...";
    commands.format ||= "gofmt -w .";
  }

  if (!commands.test && await pathExists(path.join(root, ".github", "workflows"))) {
    commands.test = "";
  }

  return commands;
}

function installCommand(packageManager) {
  if (packageManager === "pnpm") return "pnpm install";
  if (packageManager === "yarn") return "yarn install";
  if (packageManager === "bun") return "bun install";
  return "npm install";
}

function runScriptCommand(packageManager, script) {
  if (packageManager === "pnpm") return `pnpm ${script}`;
  if (packageManager === "yarn") return `yarn ${script}`;
  if (packageManager === "bun") return `bun run ${script}`;
  return `npm run ${script}`;
}

function hasPythonTool(pyproject, tool) {
  if (!pyproject) return false;
  return new RegExp(`(^|[^a-zA-Z0-9_-])${escapeRegExp(tool)}([^a-zA-Z0-9_-]|$)`, "i").test(pyproject);
}

function detectName({ packageJson, pyproject, cargoToml, goMod, root }) {
  if (packageJson?.name) return packageJson.name;
  const pyName = parseTomlValue(pyproject, "name");
  if (pyName) return pyName;
  const cargoName = parseTomlValue(cargoToml, "name");
  if (cargoName) return cargoName;
  const moduleLine = goMod.split("\n").find((line) => line.startsWith("module "));
  if (moduleLine) return moduleLine.replace(/^module\s+/, "").trim().split("/").pop();
  return path.basename(root);
}

function detectFrameworks({ packageJson, pyproject, cargoToml, goMod, files }) {
  const deps = {
    ...(packageJson?.dependencies || {}),
    ...(packageJson?.devDependencies || {}),
    ...(packageJson?.peerDependencies || {}),
  };
  const names = [];
  if (deps.next) names.push("Next.js");
  if (deps.react) names.push("React");
  if (deps.vue) names.push("Vue");
  if (deps.vite) names.push("Vite");
  if (deps.astro) names.push("Astro");
  if (deps.svelte) names.push("Svelte");
  if (deps.express) names.push("Express");
  if (deps["@nestjs/core"]) names.push("NestJS");
  if (deps.vitest) names.push("Vitest");
  if (deps.jest) names.push("Jest");
  if (hasPythonTool(pyproject, "fastapi")) names.push("FastAPI");
  if (hasPythonTool(pyproject, "django")) names.push("Django");
  if (hasPythonTool(pyproject, "flask")) names.push("Flask");
  if (hasPythonTool(pyproject, "pytest")) names.push("Pytest");
  if (/actix|axum|rocket/i.test(cargoToml)) names.push("Rust Web");
  if (/github\.com\/gin-gonic\/gin/i.test(goMod)) names.push("Gin");
  if (files.some((file) => /^src\/app\//.test(file))) names.push("Next.js App Router");
  return unique(names);
}

async function detectAgentDocs(root) {
  const definitions = [
    ["codex", "AGENTS.md"],
    ["claude", "CLAUDE.md"],
    ["gemini", "GEMINI.md"],
    ["copilot", ".github/copilot-instructions.md"],
  ];
  const docs = [];
  for (const [target, file] of definitions) {
    const absolute = path.join(root, file);
    if (await pathExists(absolute)) docs.push({ target, file });
  }
  const cursorRules = await listDirSafe(path.join(root, ".cursor", "rules"));
  for (const rule of cursorRules) {
    if (rule.isFile() && (rule.name.endsWith(".mdc") || rule.name.endsWith(".md"))) {
      docs.push({ target: "cursor", file: `.cursor/rules/${rule.name}` });
    }
  }
  return docs.sort((a, b) => a.file.localeCompare(b.file));
}

async function detectCi(root) {
  const workflowsDir = path.join(root, ".github", "workflows");
  const workflows = (await listDirSafe(workflowsDir))
    .filter((entry) => entry.isFile() && /\.(ya?ml)$/.test(entry.name))
    .map((entry) => `.github/workflows/${entry.name}`)
    .sort();
  return {
    githubActions: workflows,
  };
}

function parseTomlValue(text, key) {
  if (!text) return "";
  const match = text.match(new RegExp(`^\\s*${escapeRegExp(key)}\\s*=\\s*["']([^"']+)["']`, "m"));
  return match?.[1] || "";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
