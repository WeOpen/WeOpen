#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const command = process.argv[2] ?? "check";
const validCommands = new Set(["check", "sync"]);

if (!validCommands.has(command)) {
  console.error(`Usage: node scripts/version.mjs <${[...validCommands].join("|")}>`);
  process.exit(2);
}

const versionPath = join(root, "VERSION");
const targetVersion = readVersion(versionPath);
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

if (!semverPattern.test(targetVersion)) {
  console.error(`VERSION must contain a Semantic Versioning value, got ${JSON.stringify(targetVersion)}.`);
  process.exit(1);
}

const packageJsonPaths = findPackageJsons(root);
const textTargets = [
  {
    path: "apps/desktop/main.go",
    label: "desktop appVersion",
    pattern: /(const\s+appVersion\s*=\s*)"([^"]+)"/g
  },
  ...findPluginGoFiles(join(root, "platform/plugins")).map((path) => ({
    path: relative(root, path),
    label: "backend plugin Version()",
    pattern: /(func\s+\(p\s+Plugin\)\s+Version\(\)\s+string\s+\{\s+return\s+)"([^"]+)"(\s+\})/g
  })),
  {
    path: "apps/web/src/plugins/index.ts",
    label: "frontend plugin manifest version",
    pattern: /(version:\s*)"([^"]+)"/g
  }
];

const mismatches = [];
const errors = [];
let writes = 0;

for (const packagePath of packageJsonPaths) {
  const data = JSON.parse(readFileSync(packagePath, "utf8"));
  if (typeof data.version !== "string") {
    continue;
  }
  if (data.version !== targetVersion) {
    mismatches.push(`${relative(root, packagePath)} package version is ${data.version}, expected ${targetVersion}`);
    if (command === "sync") {
      data.version = targetVersion;
      writeIfChanged(packagePath, `${JSON.stringify(data, null, 2)}\n`);
      writes += 1;
    }
  }
}

for (const target of textTargets) {
  const absolutePath = join(root, target.path);
  if (!existsSync(absolutePath)) {
    errors.push(`${target.path} is missing (${target.label})`);
    continue;
  }

  const content = readFileSync(absolutePath, "utf8");
  let matches = 0;
  const next = content.replace(target.pattern, (...args) => {
    const prefix = args[1];
    const foundVersion = args[2];
    const suffix = typeof args[3] === "string" ? args[3] : "";
    matches += 1;
    if (foundVersion !== targetVersion) {
      mismatches.push(`${target.path} ${target.label} is ${foundVersion}, expected ${targetVersion}`);
    }
    return `${prefix}"${targetVersion}"${suffix}`;
  });

  if (matches === 0) {
    errors.push(`${target.path} has no ${target.label} match`);
    continue;
  }

  if (command === "sync" && next !== content) {
    writeIfChanged(absolutePath, next);
    writes += 1;
  }
}

if (errors.length > 0 || (mismatches.length > 0 && command === "check")) {
  console.error(`Version check failed against VERSION ${targetVersion}:`);
  for (const failure of [...errors, ...mismatches]) {
    console.error(`- ${failure}`);
  }
  if (mismatches.length > 0) {
    console.error("Run `pnpm version:sync` to update managed version fields.");
  }
  process.exit(1);
}

if (command === "sync") {
  if (writes === 0) {
    console.log(`All managed version fields already match VERSION ${targetVersion}.`);
  } else {
    console.log(`Synced ${writes} managed version file(s) to VERSION ${targetVersion}.`);
  }
  process.exit(0);
}

console.log(`All ${packageJsonPaths.length} package manifests and ${textTargets.length} source targets match VERSION ${targetVersion}.`);

function readVersion(path) {
  if (!existsSync(path)) {
    console.error("Missing root VERSION file.");
    process.exit(1);
  }
  return readFileSync(path, "utf8").trim();
}

function writeIfChanged(path, content) {
  if (readFileSync(path, "utf8") !== content) {
    writeFileSync(path, content);
  }
}

function findPackageJsons(startDir) {
  const ignoredDirs = new Set([
    ".git",
    ".next",
    ".omx",
    ".turbo",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "thesvg",
    "wailsjs"
  ]);
  const results = [];

  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      if (ignoredDirs.has(entry)) {
        continue;
      }
      const path = join(dir, entry);
      const stat = statSync(path);
      if (stat.isDirectory()) {
        walk(path);
        continue;
      }
      if (entry === "package.json") {
        results.push(path);
      }
    }
  }

  walk(startDir);
  return results.sort((a, b) => relative(root, a).localeCompare(relative(root, b)));
}

function findPluginGoFiles(startDir) {
  if (!existsSync(startDir)) {
    return [];
  }

  const results = [];
  for (const entry of readdirSync(startDir)) {
    const pluginPath = join(startDir, entry, "plugin.go");
    if (existsSync(pluginPath) && statSync(pluginPath).isFile()) {
      results.push(pluginPath);
    }
  }
  return results.sort((a, b) => basename(a).localeCompare(basename(b)) || a.localeCompare(b));
}
