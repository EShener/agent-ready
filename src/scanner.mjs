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
  [".cs", "C#"],
  [".swift", "Swift"],
  [".rb", "Ruby"],
  [".php", "PHP"],
  [".astro", "Astro"],
  [".svelte", "Svelte"],
  [".vue", "Vue"],
]);

export async function scanRepo(root = process.cwd(), options = {}) {
  const absoluteRoot = path.resolve(root);
  const config = await loadConfig(absoluteRoot, { configPath: options.configPath });
  const [
    packageJson,
    pyproject,
    cargoToml,
    goMod,
    pomXml,
    gradleBuild,
    gradleBuildKts,
    gemfile,
    composerJson,
    readmeText,
    pnpmWorkspace,
    files,
    structure,
  ] = await Promise.all([
    readJsonIfExists(path.join(absoluteRoot, "package.json")),
    readTextIfExists(path.join(absoluteRoot, "pyproject.toml")),
    readTextIfExists(path.join(absoluteRoot, "Cargo.toml")),
    readTextIfExists(path.join(absoluteRoot, "go.mod")),
    readTextIfExists(path.join(absoluteRoot, "pom.xml")),
    readTextIfExists(path.join(absoluteRoot, "build.gradle")),
    readTextIfExists(path.join(absoluteRoot, "build.gradle.kts")),
    readTextIfExists(path.join(absoluteRoot, "Gemfile")),
    readJsonIfExists(path.join(absoluteRoot, "composer.json")),
    readTextIfExists(path.join(absoluteRoot, "README.md")),
    readTextIfExists(path.join(absoluteRoot, "pnpm-workspace.yaml")),
    walkFiles(absoluteRoot),
    topLevelEntries(absoluteRoot),
  ]);

  const mergedGradleBuild = [gradleBuild, gradleBuildKts].filter(Boolean).join("\n");
  const languageCounts = countLanguages(files);
  const packageManager = await detectPackageManager(absoluteRoot, files);
  const detectedCommands = await detectCommands({
    root: absoluteRoot,
    packageJson,
    packageManager,
    pyproject,
    cargoToml,
    goMod,
    pomXml,
    gradleBuild: mergedGradleBuild,
    gemfile,
    composerJson,
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
    name: detectName({ packageJson, pyproject, cargoToml, goMod, pomXml, composerJson, files, root: absoluteRoot }),
    languages: languageCounts,
    primaryLanguage: languageCounts[0]?.name || "Unknown",
    frameworks: detectFrameworks({ packageJson, pyproject, cargoToml, goMod, pomXml, gradleBuild: mergedGradleBuild, gemfile, composerJson, files }),
    monorepo: detectMonorepo({ packageJson, pnpmWorkspace, files }),
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

async function detectPackageManager(root, files = []) {
  const checks = [
    ["pnpm", "pnpm-lock.yaml"],
    ["pnpm", "pnpm-workspace.yaml"],
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
  if (await pathExists(path.join(root, "mvnw")) || await pathExists(path.join(root, "pom.xml"))) return "maven";
  if (await pathExists(path.join(root, "gradlew")) || await pathExists(path.join(root, "build.gradle")) || await pathExists(path.join(root, "build.gradle.kts"))) return "gradle";
  if (hasDotnetSignals(files)) return "dotnet";
  if (await pathExists(path.join(root, "Gemfile"))) return "bundler";
  if (await pathExists(path.join(root, "composer.json"))) return "composer";
  return "unknown";
}

async function detectCommands({ root, packageJson, packageManager, pyproject, cargoToml, goMod, pomXml, gradleBuild, gemfile, composerJson, files }) {
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

  if (hasMavenSignals({ pomXml, files })) {
    const mvn = files.includes("mvnw") ? "./mvnw" : "mvn";
    commands.build ||= `${mvn} package`;
    commands.test ||= `${mvn} test`;
  }

  if (hasGradleSignals({ gradleBuild, files })) {
    const gradle = files.includes("gradlew") ? "./gradlew" : "gradle";
    commands.build ||= `${gradle} build`;
    commands.test ||= `${gradle} test`;
  }

  if (hasDotnetSignals(files)) {
    commands.install ||= "dotnet restore";
    commands.build ||= "dotnet build";
    commands.test ||= "dotnet test";
  }

  if (hasRailsSignals({ gemfile, files })) {
    if (commands.install) commands["backend:install"] ||= "bundle install";
    else commands.install = "bundle install";
    commands.dev ||= files.includes("bin/rails") ? "bin/rails server" : "bundle exec rails server";
    commands.test ||= files.includes("bin/rails") ? "bin/rails test" : "bundle exec rails test";
  } else if (gemfile) {
    if (commands.install) commands["backend:install"] ||= "bundle install";
    else commands.install = "bundle install";
  }

  if (hasLaravelSignals({ composerJson, files })) {
    if (commands.install) commands["backend:install"] ||= "composer install";
    else commands.install = "composer install";
    commands.dev ||= "php artisan serve";
    commands.test ||= "php artisan test";
  } else if (composerJson) {
    if (commands.install) commands["backend:install"] ||= "composer install";
    else commands.install = "composer install";
  }

  if (hasDockerComposeFile(files)) {
    commands.services ||= "docker compose up -d";
    commands["services:stop"] ||= "docker compose down";
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

function detectName({ packageJson, pyproject, cargoToml, goMod, pomXml, composerJson, files, root }) {
  if (packageJson?.name) return packageJson.name;
  const pyName = parseTomlValue(pyproject, "name");
  if (pyName) return pyName;
  const cargoName = parseTomlValue(cargoToml, "name");
  if (cargoName) return cargoName;
  if (composerJson?.name) return composerJson.name.split("/").pop();
  const artifactId = parseXmlTagValue(pomXml, "artifactId");
  if (artifactId) return artifactId;
  const csprojName = firstProjectStem(files, ".csproj");
  if (csprojName) return csprojName;
  const moduleLine = goMod.split("\n").find((line) => line.startsWith("module "));
  if (moduleLine) return moduleLine.replace(/^module\s+/, "").trim().split("/").pop();
  return path.basename(root);
}

function detectFrameworks({ packageJson, pyproject, cargoToml, goMod, pomXml, gradleBuild, gemfile, composerJson, files }) {
  const deps = {
    ...(packageJson?.dependencies || {}),
    ...(packageJson?.devDependencies || {}),
    ...(packageJson?.peerDependencies || {}),
  };
  const names = [];
  const hasNextConfig = files.some((file) => /^next\.config\.[cm]?[jt]s$/.test(file));
  const hasNextAppRouter = files.some((file) => /^(src\/)?app\/(?:.*\/)?(layout|page|route|loading|error|not-found)\.[jt]sx?$/.test(file));
  const hasNextPagesRouter = files.some((file) => /^(src\/)?pages\/.*\.[jt]sx?$/.test(file));
  const hasAstroConfig = files.some((file) => /^astro\.config\.[cm]?[jt]s$/.test(file));
  const hasAstroFiles = files.some((file) => /^(src\/)?(pages|layouts|components)\/.*\.astro$/.test(file));
  const hasSvelteConfig = files.some((file) => /^svelte\.config\.[cm]?[jt]s$/.test(file));
  const hasSvelteFiles = files.some((file) => /\.svelte$/.test(file));
  const hasSvelteKitRoutes = files.some((file) => /^(src\/)?routes\/(?:.*\/)?\+(page|layout|server|error)\.(svelte|[jt]s)$/.test(file));
  const hasNuxtConfig = files.some((file) => /^nuxt\.config\.[cm]?[jt]s$/.test(file));
  const hasNuxtRoutes = files.some((file) => /^(pages|app|server)\/.+\.(vue|[jt]s)$/.test(file) || file === "app.vue");

  if (deps.next || hasNextConfig || hasNextAppRouter || hasNextPagesRouter) names.push("Next.js");
  if (deps.react) names.push("React");
  if (deps.vue || deps.nuxt || hasNuxtConfig || hasNuxtRoutes) names.push("Vue");
  if (deps.vite) names.push("Vite");
  if (deps.astro || hasAstroConfig || hasAstroFiles) names.push("Astro");
  if (deps.svelte || deps["@sveltejs/kit"] || hasSvelteConfig || hasSvelteFiles) names.push("Svelte");
  if (deps["@sveltejs/kit"] || hasSvelteConfig || hasSvelteKitRoutes) names.push("SvelteKit");
  if (deps.nuxt || deps["@nuxt/kit"] || hasNuxtConfig || hasNuxtRoutes) names.push("Nuxt");
  if (deps.express) names.push("Express");
  if (deps["@nestjs/core"]) names.push("NestJS");
  if (deps.vitest) names.push("Vitest");
  if (deps.jest) names.push("Jest");
  if (deps.playwright || deps["@playwright/test"] || files.some((file) => /^playwright\.config\.[cm]?[jt]s$/.test(file))) {
    names.push("Playwright");
  }
  if (deps.storybook || Object.keys(deps).some((name) => name.startsWith("@storybook/")) || files.some((file) => /^\.storybook\/main\.[cm]?[jt]s$/.test(file))) {
    names.push("Storybook");
  }
  if (hasPythonTool(pyproject, "fastapi")) names.push("FastAPI");
  if (hasPythonTool(pyproject, "django")) names.push("Django");
  if (hasPythonTool(pyproject, "flask")) names.push("Flask");
  if (hasPythonTool(pyproject, "pytest")) names.push("Pytest");
  if (hasRailsSignals({ gemfile, files })) names.push("Rails");
  if (hasLaravelSignals({ composerJson, files })) names.push("Laravel");
  if (hasSpringBootSignals({ pomXml, gradleBuild })) names.push("Spring Boot");
  if (hasDotnetSignals(files)) names.push(".NET");
  if (/actix|axum|rocket/i.test(cargoToml)) names.push("Rust Web");
  if (/github\.com\/gin-gonic\/gin/i.test(goMod)) names.push("Gin");
  if (hasNextAppRouter) names.push("Next.js App Router");
  if (hasDockerfile(files)) names.push("Docker");
  if (hasDockerComposeFile(files)) names.push("Docker Compose");
  return unique(names);
}

function hasDotnetSignals(files) {
  return files.some((file) => (
    file.endsWith(".csproj")
    || file.endsWith(".sln")
    || file === "global.json"
    || /(^|\/)Program\.cs$/.test(file)
  ));
}

function firstProjectStem(files, extension) {
  const file = files.find((item) => item.endsWith(extension));
  return file ? path.basename(file, extension) : "";
}

function hasMavenSignals({ pomXml, files }) {
  return Boolean(pomXml || files.includes("mvnw"));
}

function hasGradleSignals({ gradleBuild, files }) {
  return Boolean(gradleBuild || files.includes("gradlew"));
}

function hasSpringBootSignals({ pomXml, gradleBuild }) {
  return Boolean(
    /spring-boot/i.test(pomXml)
    || /spring-boot/i.test(gradleBuild)
  );
}

function hasRailsSignals({ gemfile, files }) {
  return Boolean(
    hasRubyGem(gemfile, "rails")
    || files.includes("config/application.rb")
    || files.includes("bin/rails"),
  );
}

function hasLaravelSignals({ composerJson, files }) {
  return Boolean(
    composerJson?.require?.["laravel/framework"]
    || composerJson?.["require-dev"]?.["laravel/framework"]
    || files.includes("artisan")
    || files.includes("app/Http/Kernel.php"),
  );
}

function hasRubyGem(gemfile, gemName) {
  if (!gemfile) return false;
  return new RegExp(`(^|\\n)\\s*gem\\s+["']${escapeRegExp(gemName)}["']`, "i").test(gemfile);
}

function hasDockerfile(files) {
  return files.some((file) => /(^|\/)Dockerfile$/.test(file));
}

function hasDockerComposeFile(files) {
  return files.some((file) => /(^|\/)(docker-compose|compose)\.ya?ml$/.test(file));
}

function detectMonorepo({ packageJson, pnpmWorkspace, files }) {
  const workspacePatterns = unique([
    ...packageWorkspacePatterns(packageJson),
    ...pnpmWorkspacePatterns(pnpmWorkspace),
  ]);
  const tools = [];
  if (files.includes("pnpm-workspace.yaml")) tools.push("pnpm workspaces");
  if (packageJson?.workspaces) tools.push("package workspaces");
  if (files.includes("turbo.json")) tools.push("Turborepo");
  if (files.includes("nx.json")) tools.push("Nx");
  if (files.includes("lerna.json")) tools.push("Lerna");
  if (files.includes("rush.json")) tools.push("Rush");

  return {
    detected: Boolean(workspacePatterns.length || tools.length),
    tools: unique(tools),
    workspaces: workspacePatterns,
  };
}

function packageWorkspacePatterns(packageJson) {
  const workspaces = packageJson?.workspaces;
  if (Array.isArray(workspaces)) return workspaces.filter((item) => typeof item === "string");
  if (Array.isArray(workspaces?.packages)) return workspaces.packages.filter((item) => typeof item === "string");
  return [];
}

function pnpmWorkspacePatterns(text) {
  if (!text) return [];
  const lines = text.split("\n");
  const patterns = [];
  let inPackages = false;
  for (const line of lines) {
    if (/^\s*packages\s*:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages && /^\S/.test(line)) break;
    const match = line.match(/^\s*-\s*["']?([^"'\n#]+)["']?\s*(?:#.*)?$/);
    if (inPackages && match) patterns.push(match[1].trim());
  }
  return patterns;
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
    gitlabCi: await detectExistingFiles(root, [".gitlab-ci.yml", ".gitlab-ci.yaml"]),
    circleCi: await detectExistingFiles(root, [".circleci/config.yml", ".circleci/config.yaml"]),
  };
}

async function detectExistingFiles(root, candidates) {
  const results = [];
  for (const candidate of candidates) {
    if (await pathExists(path.join(root, candidate))) results.push(candidate);
  }
  return results;
}

function parseTomlValue(text, key) {
  if (!text) return "";
  const match = text.match(new RegExp(`^\\s*${escapeRegExp(key)}\\s*=\\s*["']([^"']+)["']`, "m"));
  return match?.[1] || "";
}

function parseXmlTagValue(text, tag) {
  if (!text) return "";
  const match = text.match(new RegExp(`<${escapeRegExp(tag)}>\\s*([^<]+?)\\s*</${escapeRegExp(tag)}>`, "i"));
  return match?.[1]?.trim() || "";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
