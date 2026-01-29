#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const SKILLS_ROOT = REPO_ROOT;

const IGNORE_DIRS_AT_ROOT = new Set([".git", ".github", "scripts", "node_modules"]);
const REPORT_PATH =
  process.env.SKILLS_SECURITY_REPORT ||
  path.join(REPO_ROOT, "scripts", "skills-security-report.json");

// Scan only “text-like” stuff
const SCAN_TEXT_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".graphql",
  ".gql",
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
  ".html",
  ".css",
  ".sql",
]);

// ------------------------------
// Stronger detection: Base64 blobs
// ------------------------------
const MAX_SCAN_CHARS = 2_000_000; // cap regex/analysis for huge files
const BASE64_RUN_RE =
  /(?:^|[^A-Za-z0-9+/=])([A-Za-z0-9+/]{800,}={0,2})(?:[^A-Za-z0-9+/=]|$)/g;
// thresholds in base64 characters
const BASE64_WARN_LEN = 5_000; // ~3.7KB decoded
const BASE64_FAIL_LEN = 50_000; // ~37KB decoded (likely smuggling)
const BASE64_MAX_RUNS_PER_FILE = 10;
const BASE64_DECODE_MAX_CHARS = 200_000; // cap decode work per run

// ------------------------------
// High entropy / packed blob detection
// ------------------------------
const ENTROPY_TOKEN_RE = /[A-Za-z0-9+/=]{120,}/g;
const ENTROPY_WARN_THRESHOLD = 4.2;
const ENTROPY_FAIL_THRESHOLD = 4.8;
const ENTROPY_TOKEN_WARN_LEN = 200;
const ENTROPY_TOKEN_FAIL_LEN = 3_000;

const ENTROPY_LINE_MIN_LEN = 300;
const ENTROPY_MAX_LINES_FLAGGED = 5;

const FILE_ENTROPY_MIN_CHARS = 8_000;
const FILE_ENTROPY_WARN_THRESHOLD = 4.3;

/**
 * CLI
 *  --skills "skill-a,skill-b"   Scan only these skill dirs (changed-skills-only)
 *  --report path/to/report.json Override report path
 */
function parseArgs(argv) {
  const args = { skills: null, report: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--skills") args.skills = (argv[++i] || "").trim();
    else if (a === "--report") args.report = (argv[++i] || "").trim();
  }
  return args;
}

const { skills: skillsArg, report: reportArg } = parseArgs(process.argv.slice(2));
const EFFECTIVE_REPORT_PATH = reportArg || REPORT_PATH;

// ---- FAIL patterns (block immediately) ----
// NOTE: We keep these conservative. This is NOT a full malware detector.
const FAIL_PATTERNS = [
  // pipe-to-shell
  { id: "remote-exec:curl-pipe-shell", re: /\b(curl|wget)\b[^\n\r]*\|\s*(bash|sh|zsh)\b/i },

  // process substitution: bash <(curl ...)
  { id: "remote-exec:process-substitution", re: /\b(bash|sh|zsh)\s+<\s*\(\s*(curl|wget)\b/i },

  // command substitution: bash -c "$(curl ...)"
  { id: "remote-exec:cmd-subst", re: /\b(bash|sh|zsh)\s+-c\s+["']?\$\((curl|wget)[^)]*\)["']?/i },

  // inline execution referencing URLs
  { id: "remote-exec:node-inline-url", re: /\bnode\s+-e\s+["'][^"']*(https?:\/\/)[^"']*["']/i },
  { id: "remote-exec:python-inline-url", re: /\bpython\d?\s+-c\s+["'][^"']*(https?:\/\/)[^"']*["']/i },

  // download-to-disk then execute (common evasion of pipe-to-shell)
  {
    id: "remote-exec:curl-to-file-then-shell",
    re: /\b(curl|wget)\b[^\n\r]*(?:-o|--output|-O)\s+\S+[^\n\r]*(?:&&|;)\s*(bash|sh|zsh)\b/i,
  },
];

// ---- WARN patterns (CODEOWNERS review) ----
const WARN_PATTERNS = [
  // generic network indicators
  { id: "network:curl-wget", re: /\b(curl|wget)\b/i },
  { id: "network:url", re: /\bhttps?:\/\/[^\s"'`<>]+/i },

  // prompt injection-ish language
  {
    id: "prompt-injection:ignore-instructions",
    re: /\b(ignore|disregard|bypass)\b[^\n\r]{0,120}\b(previous|prior|earlier)\b[^\n\r]{0,120}\b(instructions|messages|rules)\b/i,
  },
  {
    id: "prompt-injection:system-dev",
    re: /\b(ignore|disregard)\b[^\n\r]{0,120}\b(system|developer)\b[^\n\r]{0,120}\b(prompt|message|instructions)\b/i,
  },
  { id: "prompt-injection:jailbreak", re: /\b(jailbreak|override|prompt leak|system prompt)\b/i },

  // “do not disclose” style is often used to hide intent
  { id: "prompt-injection:donotdisclose", re: /\bdo not\b[^\n\r]{0,120}\b(tell|mention|reveal|disclose)\b/i },
];

// If prompt-injection is present AND these appear, escalate to FAIL
const SENSITIVE_TARGETS = [
  /\b(api[_-]?key|access[_-]?token|secret|password|credentials?)\b/i,
  /\b(\.env|environment variable|env var)\b/i,
  /\b(~\/\.ssh|id_rsa|id_ed25519|authorized_keys|known_hosts)\b/i,
  /\b(\/etc\/passwd|\/etc\/shadow)\b/i,
  /\b(cookie|cookies|session|bearer)\b/i,
  /\b(dump|print|exfiltrate|steal)\b[^\n\r]{0,50}\b(env|environment|secrets?)\b/i,
];

// package.json lifecycle script keys to scrutinize
const PACKAGE_JSON_HOOK_KEYS = new Set(["preinstall", "install", "postinstall", "prepare", "prepack", "postpack"]);

// If lifecycle scripts exist, warn. If they contain remote-exec patterns, fail.
const PACKAGE_JSON_WARN_RULE = "package-json:lifecycle-scripts-present";
const PACKAGE_JSON_FAIL_RULE = "package-json:lifecycle-remote-exec";

// ------------------------------
// Magic bytes (for base64 decoded payloads)
// ------------------------------
const MAGIC = [
  { name: "ELF", bytes: [0x7f, 0x45, 0x4c, 0x46] },
  { name: "PE", bytes: [0x4d, 0x5a] }, // MZ
  { name: "ZIP", bytes: [0x50, 0x4b, 0x03, 0x04] },
  { name: "PDF", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { name: "PNG", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { name: "GZIP", bytes: [0x1f, 0x8b] },
  { name: "WASM", bytes: [0x00, 0x61, 0x73, 0x6d] }, // \0asm
];

function detectMagic(buf) {
  for (const m of MAGIC) {
    if (buf.length >= m.bytes.length && m.bytes.every((b, i) => buf[i] === b)) return m.name;
  }
  return null;
}

function printableRatio(buf) {
  let printable = 0;
  for (const c of buf) {
    const isPrintable = (c >= 0x20 && c <= 0x7e) || c === 0x09 || c === 0x0a || c === 0x0d;
    if (isPrintable) printable++;
  }
  return buf.length ? printable / buf.length : 1;
}

function tryDecodeBase64(b64, maxChars = BASE64_DECODE_MAX_CHARS) {
  const capped = b64.length > maxChars ? b64.slice(0, maxChars) : b64;
  try {
    return Buffer.from(capped, "base64");
  } catch {
    return null;
  }
}

function findBase64Runs(text, maxRuns = BASE64_MAX_RUNS_PER_FILE) {
  const runs = [];
  BASE64_RUN_RE.lastIndex = 0;
  let m;
  while ((m = BASE64_RUN_RE.exec(text)) !== null) {
    runs.push({ index: m.index ?? 0, value: m[1], length: m[1].length });
    if (runs.length >= maxRuns) break;
  }
  return runs;
}

// ------------------------------
// “Safe suppression” helpers (avoid bypasses)
// ------------------------------
function isMinifiedJs(relPath) {
  return relPath.toLowerCase().endsWith(".min.js");
}

function isSourceMappingURLLine(line) {
  return /sourceMappingURL=/.test(line);
}

function isHexDigest(s) {
  return /^[a-f0-9]{32,}$/i.test(s);
}

// ------------------------------
// Entropy helpers
// ------------------------------
function shannonEntropy(str) {
  if (!str || str.length === 0) return 0;
  const freq = new Map();
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    freq.set(c, (freq.get(c) || 0) + 1);
  }
  let ent = 0;
  const len = str.length;
  for (const [, count] of freq.entries()) {
    const p = count / len;
    ent -= p * Math.log2(p);
  }
  return ent;
}

function snippetLine(lineText) {
  if (!lineText) return "";
  return lineText.length > 240 ? lineText.slice(0, 240) + "…" : lineText;
}

// ---------- helpers ----------
function safeJoin(base, target) {
  const resolved = path.resolve(base, target);
  if (!resolved.startsWith(path.resolve(base) + path.sep)) {
    throw new Error(`Path traversal detected: ${target}`);
  }
  return resolved;
}

function getAllSkillDirs() {
  const rootEntries = fs.readdirSync(SKILLS_ROOT, { withFileTypes: true });
  return rootEntries
    .filter((e) => e.isDirectory() && !IGNORE_DIRS_AT_ROOT.has(e.name) && !e.name.startsWith("."))
    .map((e) => e.name);
}

function getRequestedSkillDirs(allSkillDirs) {
  if (!skillsArg) return null;
  const requested = skillsArg
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const all = new Set(allSkillDirs);
  return requested.filter((s) => all.has(s));
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
    }
  }

  return files;
}

function findAllMatchesWithContext(content, re) {
  // Always use global for multi-hit reporting
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  const rg = new RegExp(re.source, flags);

  const lines = content.split(/\r?\n/);

  // Build "line start offsets" to map match.index -> line number
  const offsets = [];
  let pos = 0;
  for (let i = 0; i < lines.length; i++) {
    offsets.push(pos);
    pos += lines[i].length + 1; // + '\n' (approx; OK for mapping)
  }

  const hits = [];
  let m;
  while ((m = rg.exec(content)) !== null) {
    const idx = m.index ?? 0;

    // find line number via binary-ish search
    let lo = 0;
    let hi = offsets.length - 1;
    let lineIdx = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (offsets[mid] <= idx) {
        lineIdx = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    const lineNumber = lineIdx + 1;
    const lineText = lines[lineIdx] ?? "";
    const snippet = lineText.length > 240 ? lineText.slice(0, 240) + "…" : lineText;

    hits.push({ line: lineNumber, snippet });
    // Prevent infinite loops on zero-length matches
    if (m[0] === "") rg.lastIndex++;
    // Cap to avoid huge spam if a pattern matches tons
    if (hits.length >= 20) break;
  }

  return hits;
}

function ensureDir(p) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
}

function main() {
  const allSkillDirs = getAllSkillDirs();

  const requested = getRequestedSkillDirs(allSkillDirs);
  const skillDirs = requested ?? allSkillDirs;

  const report = {
    status: "PASS", // PASS | WARN | FAIL
    generatedAt: new Date().toISOString(),
    scanned_skills: skillDirs,
    totals: { warnings: 0, failures: 0, scannedFiles: 0 },
    findings: [], // {severity, skill, file, ruleId, message, line?, snippet?}
  };

  if (requested && requested.length === 0) {
    report.status = "PASS";
    ensureDir(EFFECTIVE_REPORT_PATH);
    fs.writeFileSync(EFFECTIVE_REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
    console.log("✅ No matching changed skill directories to scan. Wrote empty security report.");
    console.log(`📝 ${path.relative(REPO_ROOT, EFFECTIVE_REPORT_PATH)}`);
    process.exit(0);
  }

  for (const skillName of skillDirs) {
    const skillPath = path.join(SKILLS_ROOT, skillName);
    const files = walkDir(skillPath, skillName);

    // ---- package.json lifecycle hook checks (skill-scoped) ----
    const pkgFile = files.find((f) => path.basename(f.rel) === "package.json");
    if (pkgFile) {
      try {
        const pkgRaw = fs.readFileSync(pkgFile.abs, "utf8");
        const pkg = JSON.parse(pkgRaw);
        const scripts = pkg && pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : null;

        if (scripts) {
          const hookKeys = Object.keys(scripts).filter((k) => PACKAGE_JSON_HOOK_KEYS.has(k));
          if (hookKeys.length > 0) {
            // WARN: lifecycle scripts exist (review required)
            report.totals.warnings += 1;
            report.findings.push({
              severity: "WARN",
              skill: skillName,
              file: pkgFile.rel,
              ruleId: PACKAGE_JSON_WARN_RULE,
              message: `package.json contains lifecycle scripts: ${hookKeys.join(", ")} (review required)`,
            });

            // FAIL if any lifecycle script contains remote-exec fail patterns
            for (const key of hookKeys) {
              const value = String(scripts[key] ?? "");
              for (const p of FAIL_PATTERNS) {
                if (p.re.test(value)) {
                  report.totals.failures += 1;
                  report.findings.push({
                    severity: "FAIL",
                    skill: skillName,
                    file: pkgFile.rel,
                    ruleId: PACKAGE_JSON_FAIL_RULE,
                    message: `Lifecycle script "${key}" contains blocked remote-exec pattern (${p.id})`,
                    // best-effort “context” (not line based, but helpful)
                    snippet: value.length > 240 ? value.slice(0, 240) + "…" : value,
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        report.totals.warnings += 1;
        report.findings.push({
          severity: "WARN",
          skill: skillName,
          file: pkgFile.rel,
          ruleId: "package-json:unreadable",
          message: `Could not parse package.json for hook scanning: ${e.message}`,
        });
      }
    }

    // ---- file scanning ----
    for (const { abs, rel } of files) {
      const ext = path.extname(rel).toLowerCase();
      if (!ext || !SCAN_TEXT_EXTENSIONS.has(ext)) continue;

      let content = "";
      try {
        content = fs.readFileSync(abs, "utf8");
      } catch {
        report.totals.warnings += 1;
        report.findings.push({
          severity: "WARN",
          skill: skillName,
          file: rel,
          ruleId: "scan:unreadable-text",
          message: "Could not read file as UTF-8 text for scanning",
        });
        continue;
      }

      report.totals.scannedFiles += 1;

      // Cap to keep runtime predictable on huge files
      if (content.length > MAX_SCAN_CHARS) {
        report.totals.warnings += 1;
        report.findings.push({
          severity: "WARN",
          skill: skillName,
          file: rel,
          ruleId: "scan:large-text-file",
          message: `File is very large (${content.length} chars). Security scan used capped analysis.`,
        });
      }
      const capped = content.length > MAX_SCAN_CHARS ? content.slice(0, MAX_SCAN_CHARS) : content;
      const lines = capped.split(/\r?\n/);

      // ------------------------------
      // Base64 blob detection
      // ------------------------------
      const base64Runs = findBase64Runs(capped);
      if (base64Runs.length > 0) {
        for (const run of base64Runs) {
          const line = capped.slice(0, run.index).split(/\r?\n/).length;
          const lineText = lines[line - 1] ?? "";
          const snippet = snippetLine(lineText);

          if (run.length >= BASE64_FAIL_LEN) {
            report.totals.failures += 1;
            report.findings.push({
              severity: "FAIL",
              skill: skillName,
              file: rel,
              ruleId: "content:base64-large-blob",
              message: `Large base64 blob detected (${run.length} chars) — potential payload smuggling`,
              line,
              snippet,
            });
            continue;
          }

          if (run.length >= BASE64_WARN_LEN) {
            report.totals.warnings += 1;
            report.findings.push({
              severity: "WARN",
              skill: skillName,
              file: rel,
              ruleId: "content:base64-blob",
              message: `Base64 blob detected (${run.length} chars) — review expected purpose`,
              line,
              snippet,
            });
          }

          // Decode a capped sample to check if it looks like binary payload
          const decoded = tryDecodeBase64(run.value);
          if (decoded && decoded.length > 0) {
            const magic = detectMagic(decoded);
            if (magic) {
              report.totals.failures += 1;
              report.findings.push({
                severity: "FAIL",
                skill: skillName,
                file: rel,
                ruleId: "content:base64-decodes-to-binary",
                message: `Base64 decodes to binary magic (${magic}) — payload smuggling`,
                line,
                snippet,
              });
              continue;
            }

            const pr = printableRatio(decoded);
            // If it's a meaningful-sized run and decodes to low-printable bytes, flag it.
            if (run.length >= BASE64_WARN_LEN && pr < 0.5) {
              report.totals.warnings += 1;
              report.findings.push({
                severity: "WARN",
                skill: skillName,
                file: rel,
                ruleId: "content:base64-decodes-binaryish",
                message: `Base64 decodes to low-printable content (printableRatio=${pr.toFixed(2)})`,
                line,
                snippet,
              });
            }
          }
        }
      }

      // ------------------------------
      // High entropy / packed blob detection
      // ------------------------------
      const isMinJs = isMinifiedJs(rel);

      // (A) Token-level: long random-looking strings
      let tokenCount = 0;
      ENTROPY_TOKEN_RE.lastIndex = 0;
      let tm;
      while ((tm = ENTROPY_TOKEN_RE.exec(capped)) !== null) {
        const token = tm[0];
        const idx = tm.index ?? 0;
        const line = capped.slice(0, idx).split(/\r?\n/).length;
        const lineText = lines[line - 1] ?? "";
        const snippet = snippetLine(lineText);

        const ent = shannonEntropy(token);
        tokenCount++;
        if (tokenCount > 10) break;

        const tokenIsHex = isHexDigest(token);

        if (token.length >= ENTROPY_TOKEN_FAIL_LEN && ent >= ENTROPY_FAIL_THRESHOLD) {
          report.totals.failures += 1;
          report.findings.push({
            severity: "FAIL",
            skill: skillName,
            file: rel,
            ruleId: "content:entropy-packed-blob",
            message: `Very large high-entropy token detected (len=${token.length}, entropy=${ent.toFixed(
              2
            )}) — likely packed/obfuscated payload`,
            line,
            snippet,
          });
          continue;
        }

        if (!tokenIsHex && token.length >= ENTROPY_TOKEN_WARN_LEN && ent >= ENTROPY_WARN_THRESHOLD) {
          report.totals.warnings += 1;
          report.findings.push({
            severity: "WARN",
            skill: skillName,
            file: rel,
            ruleId: "content:entropy-suspicious-token",
            message: `High-entropy token detected (len=${token.length}, entropy=${ent.toFixed(
              2
            )}) — review for obfuscation/payload packing`,
            line,
            snippet,
          });
        }
      }

      // (B) Line-level: lines that are unusually random-looking
      // Skip for .min.js (very noisy), but keep for normal source.
      if (!isMinJs) {
        let flaggedLines = 0;
        for (let i = 0; i < lines.length; i++) {
          if (flaggedLines >= ENTROPY_MAX_LINES_FLAGGED) break;
          const lineText = lines[i];
          if (!lineText || lineText.length < ENTROPY_LINE_MIN_LEN) continue;

          // Skip the standard sourcemap reference line
          if (isSourceMappingURLLine(lineText)) continue;

          // Ignore common “minified-ish” lines a bit by requiring few spaces
          const spaceRatio = (lineText.match(/\s/g) || []).length / lineText.length;
          if (spaceRatio > 0.15) continue;

          const ent = shannonEntropy(lineText);
          if (ent >= ENTROPY_WARN_THRESHOLD) {
            flaggedLines++;
            report.totals.warnings += 1;
            report.findings.push({
              severity: "WARN",
              skill: skillName,
              file: rel,
              ruleId: "content:entropy-high-line",
              message: `High-entropy line detected (entropy=${ent.toFixed(2)}, len=${lineText.length}) — possible obfuscation`,
              line: i + 1,
              snippet: snippetLine(lineText),
            });
          }
        }
      }

      // (C) Whole-file entropy (WARN only; can be noisy)
      // Skip for .min.js
      if (!isMinJs && capped.length >= FILE_ENTROPY_MIN_CHARS) {
        const ent = shannonEntropy(capped);
        if (ent >= FILE_ENTROPY_WARN_THRESHOLD) {
          report.totals.warnings += 1;
          report.findings.push({
            severity: "WARN",
            skill: skillName,
            file: rel,
            ruleId: "content:entropy-high-file",
            message: `Overall file entropy is high (entropy=${ent.toFixed(
              2
            )}) — review if this is minified/obfuscated/packed content`,
            line: 1,
            snippet: snippetLine(lines[0] ?? ""),
          });
        }
      }

      // FAIL patterns (with line/snippet)
      for (const p of FAIL_PATTERNS) {
        const hits = findAllMatchesWithContext(capped, p.re);
        if (hits.length > 0) {
          for (const h of hits) {
            report.totals.failures += 1;
            report.findings.push({
              severity: "FAIL",
              skill: skillName,
              file: rel,
              ruleId: p.id,
              message: "Remote exec / download-and-execute pattern detected",
              line: h.line,
              snippet: h.snippet,
            });
          }
        }
      }

      // WARN patterns (with line/snippet)
      let injectionWarnHit = false;
      for (const p of WARN_PATTERNS) {
        const hits = findAllMatchesWithContext(capped, p.re);
        if (hits.length > 0) {
          if (p.id.startsWith("prompt-injection:")) injectionWarnHit = true;

          for (const h of hits) {
            report.totals.warnings += 1;
            report.findings.push({
              severity: "WARN",
              skill: skillName,
              file: rel,
              ruleId: p.id,
              message: "Suspicious indicator detected (review required)",
              line: h.line,
              snippet: h.snippet,
            });
          }
        }
      }

      // Escalate if prompt-injection + sensitive targets
      if (injectionWarnHit) {
        for (const re of SENSITIVE_TARGETS) {
          if (re.test(capped)) {
            // give reviewers a specific place to look: point to the first sensitive hit line if possible
            const sensitiveHits = findAllMatchesWithContext(capped, re);
            const h = sensitiveHits[0];

            report.totals.failures += 1;
            report.findings.push({
              severity: "FAIL",
              skill: skillName,
              file: rel,
              ruleId: "prompt-injection:secrets-escalation",
              message: "Prompt-injection language combined with sensitive target keywords",
              ...(h ? { line: h.line, snippet: h.snippet } : {}),
            });
            break;
          }
        }
      }
    }
  }

  if (report.totals.failures > 0) report.status = "FAIL";
  else if (report.totals.warnings > 0) report.status = "WARN";

  ensureDir(EFFECTIVE_REPORT_PATH);
  fs.writeFileSync(EFFECTIVE_REPORT_PATH, JSON.stringify(report, null, 2), "utf8");

  console.log(`✅ Wrote security report: ${path.relative(REPO_ROOT, EFFECTIVE_REPORT_PATH)}`);
  console.log(
    `📊 Status: ${report.status} | FAIL=${report.totals.failures} WARN=${report.totals.warnings} FILES=${report.totals.scannedFiles}`
  );

  // Exit code: only FAIL blocks merges
  process.exit(report.status === "FAIL" ? 1 : 0);
}

main();
