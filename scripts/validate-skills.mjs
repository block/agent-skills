#!/usr/bin/env node
/**
 * Validate Agent Skills repository structure.
 *
 * Rules:
 * - Each top-level skill folder must contain SKILL.md
 * - SKILL.md must have YAML frontmatter with:
 *   name, description, author, version, tags[]
 * - Block obvious unsafe stuff:
 *   - symlinks
 *   - path traversal
 *   - denylisted filenames
 *   - denylisted extensions
 * - File size limits
 */

import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();

// Where skills live (top-level folders). If you later move them to `skills/`, update this.
const SKILLS_ROOT = REPO_ROOT;

// Limits / allowlists
const MAX_FILE_BYTES = 1_000_000; // 1MB per file
const MAX_FILES_PER_SKILL = 200;

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

// Allow common text + scripts (supporting files)
const ALLOW_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".sh",
  ".bash",
  ".zsh",
  ".py",
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".css",
  ".html",
]);

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function isSymlink(p) {
  const st = fs.lstatSync(p);
  return st.isSymbolicLink();
}

function safeJoin(base, target) {
  // Prevent path traversal
  const resolved = path.resolve(base, target);
  if (!resolved.startsWith(path.resolve(base) + path.sep)) {
    throw new Error(`Path traversal detected: ${target}`);
  }
  return resolved;
}

// Very small frontmatter parser (no deps)
// Accepts:
// ---\nkey: value\ntags:\n - a\n---\nbody...
function parseFrontmatter(md) {
  const trimmed = md.replace(/^\uFEFF/, ""); // strip BOM
  if (!trimmed.startsWith("---\n")) return null;

  const end = trimmed.indexOf("\n---\n", 4);
  if (end === -1) return null;

  const yamlText = trimmed.slice(4, end).trimEnd();
  const body = trimmed.slice(end + "\n---\n".length);

  const fm = {};
  let currentKey = null;

  for (const rawLine of yamlText.split("\n")) {
    const line = rawLine.replace(/\r$/, "");

    // skip empty
    if (!line.trim()) continue;

    // list item
    const listMatch = line.match(/^\s*-\s+(.*)\s*$/);
    if (listMatch && currentKey) {
      if (!Array.isArray(fm[currentKey])) fm[currentKey] = [];
      fm[currentKey].push(listMatch[1]);
      continue;
    }

    // key: value
    const kv = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)\s*$/);
    if (kv) {
      const key = kv[1];
      let value = kv[2];

      currentKey = key;

      // key: (start list)
      if (value === "") {
        fm[key] = fm[key] ?? [];
        continue;
      }

      // strip quotes
      value = value.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
      fm[key] = value;
      continue;
    }

    // If we get here, YAML is too complex for this parser
    throw new Error(
      `Unsupported frontmatter line: "${line}". Keep frontmatter simple (key: value, lists).`
    );
  }

  return { frontmatter: fm, body };
}

function validateSkillFrontmatter(skillDir, fm) {
  const requiredString = ["name", "description", "author", "version"];
  for (const k of requiredString) {
    const v = fm[k];
    if (typeof v !== "string" || !v.trim()) {
      fail(`${skillDir}: frontmatter "${k}" is required and must be a non-empty string.`);
    }
  }

  // tags must be a non-empty list of strings
  const tags = fm.tags;
  if (!Array.isArray(tags) || tags.length === 0 || tags.some(t => typeof t !== "string" || !t.trim())) {
    fail(`${skillDir}: frontmatter "tags" is required and must be a non-empty list of strings.`);
  }
}

function walkDir(dir, relativeBase) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const ent of entries) {
    const rel = path.join(relativeBase, ent.name);
    const abs = safeJoin(REPO_ROOT, rel);

    if (ent.isDirectory()) {
      // ignore common non-skill dirs at repo root
      // (but inside a skill folder, we allow subdirs like templates/)
      files.push(...walkDir(abs, rel));
    } else if (ent.isFile()) {
      files.push({ abs, rel });
    } else {
      // block symlinks and other special files
      if (isSymlink(abs)) {
        fail(`Symlink not allowed: ${rel}`);
      } else {
        fail(`Unsupported file type: ${rel}`);
      }
    }
  }

  return files;
}

function main() {
  const rootEntries = fs.readdirSync(SKILLS_ROOT, { withFileTypes: true });

  // skill folders are top-level directories excluding known repo dirs
  const IGNORE_DIRS = new Set([".git", ".github", "scripts", "node_modules"]);
  const skillDirs = rootEntries
    .filter(e => e.isDirectory() && !IGNORE_DIRS.has(e.name) && !e.name.startsWith("."))
    .map(e => e.name);

  if (skillDirs.length === 0) {
    fail("No skill directories found at repo root.");
    return;
  }

  ok(`Found ${skillDirs.length} skill directories.`);

  for (const skillName of skillDirs) {
    const skillPath = path.join(SKILLS_ROOT, skillName);
    const skillMd = path.join(skillPath, "SKILL.md");

    if (!fs.existsSync(skillMd)) {
      fail(`${skillName}: missing SKILL.md`);
      continue;
    }

    // Validate frontmatter
    const mdText = fs.readFileSync(skillMd, "utf8");
    let parsed;
    try {
      parsed = parseFrontmatter(mdText);
      if (!parsed) {
        fail(`${skillName}: SKILL.md must start with YAML frontmatter (---).`);
      } else {
        validateSkillFrontmatter(skillName, parsed.frontmatter);
      }
    } catch (e) {
      fail(`${skillName}: invalid frontmatter. ${e.message}`);
    }

    // Validate files under skill directory
    const files = walkDir(skillPath, skillName);

    if (files.length > MAX_FILES_PER_SKILL) {
      fail(`${skillName}: too many files (${files.length}). Limit is ${MAX_FILES_PER_SKILL}.`);
    }

    for (const { abs, rel } of files) {
      const base = path.basename(rel);
      const ext = path.extname(rel).toLowerCase();

      if (DENY_FILENAMES.has(base)) {
        fail(`${skillName}: denylisted filename present: ${rel}`);
      }

      if (DENY_EXTENSIONS.has(ext)) {
        fail(`${skillName}: denylisted extension "${ext}" present: ${rel}`);
      }

      // If it has an extension, ensure it's in allowlist OR it's SKILL.md
      if (ext && !ALLOW_EXTENSIONS.has(ext) && base !== "SKILL.md") {
        fail(`${skillName}: extension "${ext}" not allowed: ${rel}`);
      }

      // Size check
      const st = fs.statSync(abs);
      if (st.size > MAX_FILE_BYTES) {
        fail(`${skillName}: file too large (${st.size} bytes): ${rel}`);
      }

      // Block symlinks explicitly (walkDir should catch, but extra safety)
      if (isSymlink(abs)) {
        fail(`${skillName}: symlinks not allowed: ${rel}`);
      }
    }

    ok(`${skillName}: validated`);
  }

  if (process.exitCode) {
    console.error("\nOne or more validations failed.");
    process.exit(1);
  } else {
    console.log("\nAll skills validated successfully.");
  }
}

main();
