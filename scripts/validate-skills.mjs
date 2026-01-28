#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const SKILLS_ROOT = REPO_ROOT;

const MAX_FILE_BYTES = 1_000_000;
const MAX_FILES_PER_SKILL = 400;

const DENY_FILENAMES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  ".npmrc",
  ".yarnrc",
  ".pypirc",
  "id_rsa",
  "id_ed25519",
  "known_hosts",
  "authorized_keys",
]);

const DENY_EXTENSIONS = new Set([
  ".exe",
  ".dll",
  ".dmg",
  ".pkg",
  ".msi",
  ".bin",
  ".so",
  ".class",
  ".jar",
  ".pyc",
  ".o",
  ".a",
  ".zip",
  ".tar",
  ".gz",
  ".7z",
]);

const ALLOW_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".graphql",
  ".css",
  ".html",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".py",
  ".sh",
  ".bash",
  ".zsh",
  ".sql",
]);

const ALLOW_FILENAMES = new Set([
  "SKILL.md",
  "LICENSE",
  "NOTICE",
  "README",
  "README.md",
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  ".gitignore",
]);

const IGNORE_DIRS_AT_ROOT = new Set([".git", ".github", "scripts", "node_modules"]);

let hadFailure = false;

function fail(msg) {
  hadFailure = true;
  console.error(`❌ ${msg}`);
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function isSymlink(p) {
  return fs.lstatSync(p).isSymbolicLink();
}

function safeJoin(base, target) {
  const resolved = path.resolve(base, target);
  if (!resolved.startsWith(path.resolve(base) + path.sep)) {
    throw new Error(`Path traversal detected: ${target}`);
  }
  return resolved;
}

// --- frontmatter parsing ---
function parseFrontmatter(md) {
  const trimmed = md.replace(/^\uFEFF/, "");
  if (!trimmed.startsWith("---\n")) return null;
  const end = trimmed.indexOf("\n---\n", 4);
  if (end === -1) return null;

  const yamlText = trimmed.slice(4, end).trimEnd();
  const fm = {};
  let currentKey = null;

  for (const rawLine of yamlText.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (!line.trim()) continue;

    const listMatch = line.match(/^\s*-\s+(.*)\s*$/);
    if (listMatch && currentKey) {
      if (!Array.isArray(fm[currentKey])) fm[currentKey] = [];
      fm[currentKey].push(listMatch[1]);
      continue;
    }

    const kv = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)\s*$/);
    if (kv) {
      const key = kv[1];
      let value = kv[2];
      currentKey = key;

      if (value === "") {
        fm[key] = fm[key] ?? [];
        continue;
      }

      value = value.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
      fm[key] = value;
      continue;
    }

    throw new Error(`Unsupported frontmatter line: "${line}"`);
  }

  return { frontmatter: fm };
}

function validateSkillFrontmatter(skillName, fm) {
  const required = ["name", "description", "author", "version"];
  for (const k of required) {
    const v = fm[k];
    if (typeof v !== "string" || !v.trim()) {
      fail(`${skillName}: frontmatter "${k}" must be a non-empty string`);
    }
  }

  const tags = fm.tags;
  if (!Array.isArray(tags) || tags.length === 0 || tags.some((t) => typeof t !== "string" || !t.trim())) {
    fail(`${skillName}: frontmatter "tags" must be a non-empty list of strings`);
  }
}

function walkDir(dir, relativeBase) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const ent of entries) {
    const rel = path.join(relativeBase, ent.name);
    const abs = safeJoin(REPO_ROOT, rel);

    if (ent.isDirectory()) {
      files.push(...walkDir(abs, rel));
    } else if (ent.isFile()) {
      files.push({ abs, rel });
    } else {
      // includes symlinks/specials
      try {
        if (isSymlink(abs)) fail(`${relativeBase}: symlink not allowed: ${rel}`);
        else fail(`${relativeBase}: unsupported file type: ${rel}`);
      } catch {
        fail(`${relativeBase}: unsupported/special file: ${rel}`);
      }
    }
  }

  return files;
}

function main() {
  const rootEntries = fs.readdirSync(SKILLS_ROOT, { withFileTypes: true });

  const skillDirs = rootEntries
    .filter((e) => e.isDirectory() && !IGNORE_DIRS_AT_ROOT.has(e.name) && !e.name.startsWith("."))
    .map((e) => e.name);

  if (skillDirs.length === 0) {
    fail("No skill directories found at repo root.");
    process.exit(1);
  }

  ok(`Found ${skillDirs.length} skill directories.`);

  for (const skillName of skillDirs) {
    const skillPath = path.join(SKILLS_ROOT, skillName);
    const skillMd = path.join(skillPath, "SKILL.md");

    if (!fs.existsSync(skillMd)) {
      fail(`${skillName}: missing SKILL.md`);
      continue;
    }

    try {
      const parsed = parseFrontmatter(fs.readFileSync(skillMd, "utf8"));
      if (!parsed) fail(`${skillName}: SKILL.md must start with YAML frontmatter (---)`);
      else validateSkillFrontmatter(skillName, parsed.frontmatter);
    } catch (e) {
      fail(`${skillName}: invalid frontmatter: ${e?.message ?? String(e)}`);
    }

    const files = walkDir(skillPath, skillName);

    if (files.length > MAX_FILES_PER_SKILL) {
      fail(`${skillName}: too many files (${files.length}). Limit ${MAX_FILES_PER_SKILL}`);
    }

    for (const { abs, rel } of files) {
      // block symlinks (again, in case)
      try {
        if (isSymlink(abs)) {
          fail(`${skillName}: symlink not allowed: ${rel}`);
          continue;
        }
      } catch {
        fail(`${skillName}: could not stat file: ${rel}`);
        continue;
      }

      const base = path.basename(rel);
      const ext = path.extname(rel).toLowerCase();

      if (DENY_FILENAMES.has(base)) fail(`${skillName}: denylisted filename: ${rel}`);
      if (DENY_EXTENSIONS.has(ext)) fail(`${skillName}: denylisted extension "${ext}": ${rel}`);

      const isAllowedByName = ALLOW_FILENAMES.has(base);
      if (!isAllowedByName) {
        if (ext) {
          if (!ALLOW_EXTENSIONS.has(ext) && base !== "SKILL.md") {
            fail(`${skillName}: extension "${ext}" not allowed: ${rel}`);
          }
        } else {
          // no-extension files are risky; treat as fail to be strict
          fail(`${skillName}: file without extension not allowed: ${rel}`);
        }
      }

      const st = fs.statSync(abs);
      if (st.size > MAX_FILE_BYTES) fail(`${skillName}: file too large (${st.size} bytes): ${rel}`);
    }

    if (!hadFailure) ok(`${skillName}: structure validated`);
  }

  if (hadFailure) {
    console.error("\nStructure validation FAILED.");
    process.exit(1);
  }

  console.log("\nStructure validation PASSED.");
  process.exit(0);
}

main();
