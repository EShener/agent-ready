import fs from "node:fs/promises";
import path from "node:path";

export const DEFAULT_IGNORES = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  "vendor",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  ".cache",
  "target",
  "__pycache__",
  "fixtures",
  ".venv",
  "venv",
  ".idea",
  ".vscode",
]);

export async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readTextIfExists(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return "";
    throw error;
  }
}

export async function readJsonIfExists(filePath) {
  const text = await readTextIfExists(filePath);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    error.message = `Invalid JSON in ${filePath}: ${error.message}`;
    throw error;
  }
}

export async function listDirSafe(dir) {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return [];
    throw error;
  }
}

export async function walkFiles(root, options = {}) {
  const maxFiles = options.maxFiles ?? 600;
  const ignores = options.ignores ?? DEFAULT_IGNORES;
  const files = [];

  async function visit(current) {
    if (files.length >= maxFiles) return;
    const entries = await listDirSafe(current);
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (files.length >= maxFiles) return;
      if (ignores.has(entry.name)) continue;
      const absolute = path.join(current, entry.name);
      const relative = toPosix(path.relative(root, absolute));
      if (entry.isDirectory()) {
        await visit(absolute);
      } else if (entry.isFile()) {
        files.push(relative);
      }
    }
  }

  await visit(root);
  return files;
}

export async function topLevelEntries(root) {
  const entries = await listDirSafe(root);
  return entries
    .filter((entry) => !DEFAULT_IGNORES.has(entry.name))
    .map((entry) => ({
      name: entry.name,
      type: entry.isDirectory() ? "directory" : "file",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function writeText(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

export function toPosix(value) {
  return value.split(path.sep).join("/");
}

export function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function basenameWithoutExtension(filePath) {
  const base = path.basename(filePath);
  const index = base.lastIndexOf(".");
  return index === -1 ? base : base.slice(0, index);
}
