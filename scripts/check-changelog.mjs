#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const changelogPath = join(root, "CHANGELOG.md");
const versionPath = join(root, "VERSION");
const failures = [];
const allowedChangeTypes = new Set(["Added", "Changed", "Deprecated", "Removed", "Fixed", "Security"]);

if (!existsSync(changelogPath)) {
  failures.push("CHANGELOG.md is missing.");
} else {
  const changelog = readFileSync(changelogPath, "utf8");
  const version = existsSync(versionPath) ? readFileSync(versionPath, "utf8").trim() : "";

  requireMatch(changelog, /^# Changelog\s*$/m, "CHANGELOG.md must start with a `# Changelog` heading.");
  requireMatch(changelog, /https:\/\/keepachangelog\.com\/en\/1\.1\.0\//, "CHANGELOG.md must reference Keep a Changelog 1.1.0.");
  requireMatch(changelog, /https:\/\/semver\.org\/spec\/v2\.0\.0\.html/, "CHANGELOG.md must reference Semantic Versioning 2.0.0.");
  requireMatch(changelog, /^## \[Unreleased\]\s*$/m, "CHANGELOG.md must contain a top-level [Unreleased] section.");

  if (version) {
    const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    requireMatch(
      changelog,
      new RegExp(`^## \\[${escapedVersion}\\] - \\d{4}-\\d{2}-\\d{2}\\s*$`, "m"),
      `CHANGELOG.md must contain a dated release section for VERSION ${version}.`
    );
  } else {
    failures.push("VERSION is missing or empty.");
  }

  for (const match of changelog.matchAll(/^### (.+)$/gm)) {
    const heading = match[1].trim();
    if (!allowedChangeTypes.has(heading)) {
      failures.push(`Unsupported changelog change type: ${heading}. Use ${[...allowedChangeTypes].join(", ")}.`);
    }
  }
}

if (process.argv.includes("--staged")) {
  const staged = stagedFiles();
  if (staged.length > 0 && !staged.includes("CHANGELOG.md")) {
    failures.push("Staged commit does not include CHANGELOG.md. Add a changelog entry or split the commit.");
  }
}

if (failures.length > 0) {
  console.error("Changelog check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("CHANGELOG.md matches the repository changelog policy.");

function requireMatch(content, pattern, message) {
  if (!pattern.test(content)) {
    failures.push(message);
  }
}

function stagedFiles() {
  try {
    return execFileSync("git", ["diff", "--cached", "--name-only"], {
      cwd: root,
      encoding: "utf8"
    })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
