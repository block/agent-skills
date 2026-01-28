#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

/**
 * CLI
 *  --skills "skill-a,skill-b"     Scan only these skill dirs (changed-skills-only)
 *  --report path/to/report.json   Override report path
 *  --sarif  path/to/report.sarif  Also write SARIF (for GitHub code scanning)
 *  --repo-root path               Treat this directory as repo root (fork-safe scanning)
 */
function parseArgs(argv) {
  const args = { skills: null, report: null, sarif: null, repoRoot: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--skills") args.skills = (argv[++i] || "").trim();
    else if (a === "--report") args.report = (argv[++i] || "").trim();
    else if (a === "--sarif") args.sarif = (argv[++i] || "").trim();
    else if (a === "--repo-root") args.repoRoot = (argv[++i] || "").trim();
  }
  return args;
}

const {
  skills: skillsArg,
  report: reportArg,
  sarif: sarifArg,
  repoRoot: repoRootArg,
} = parseArgs(process.argv.slice(2));

// ✅ Use explicit repo root if provided (for fork-safe scanning)
const REPO_ROOT = repoRootArg ? path.resolve(repoRootArg) : process.cwd();
const SKILLS_ROOT = REPO_ROOT;

const IGNORE_DIRS_AT_ROOT = new Set([".git", ".github", "scripts", "node_modules"]);

const REPORT_PATH =
  process.env.SKILLS_SECURITY_REPORT ||
  path.join(REPO_ROOT, "scripts", "skills-security-report.json");

const EFFECTIVE_REPORT_PATH = reportArg ? path.resolve(reportArg) : REPORT_PATH;

// Default SARIF path: alongside JSON report, unless overridden or omitted
const DEFAULT_SARIF_PATH = path.join(path.dirname(EFFECTIVE_REPORT_PATH), "skills-security-report.sarif");
const EFFECTIVE_SARIF_PATH = sarifArg ? path.resolve(sarifArg) : null;

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
const PACKAGE_JSON_HOOK_KEYS = new Set([
  "preinstall",
  "install",
  "postinstall",
  "prepare",
  "prepack",
  "postpack",
]);

// If lifecycle scripts exist, warn. If they contain remote-exec patterns, fail.
const PACKAGE_JSON_WARN_RULE = "package-json:lifecycle-scripts-present";
const PACKAGE_JSON_FAIL_RULE = "package-json:lifecycle-remote-exec";

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

function normalizeFindings(findings) {
  // De-dupe exact duplicates
  const seen = new Set();
  const deduped = [];
  for (const f of findings) {
    const key = [f.severity, f.ruleId, f.skill, f.file, f.line ?? "", f.snippet ?? ""].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(f);
  }

  // If a line has a FAIL, drop network:* WARNs on that same line
  const failLoc = new Set(
    deduped
      .filter((f) => f.severity === "FAIL")
      .map((f) => `${f.skill}|${f.file}|${f.line ?? ""}`)
  );

  const cleaned = deduped.filter((f) => {
    if (f.severity !== "WARN") return true;
    if (!String(f.ruleId || "").startsWith("network:")) return true;
    const loc = `${f.skill}|${f.file}|${f.line ?? ""}`;
    return !failLoc.has(loc);
  });

  return cleaned;
}

// ---------- SARIF helpers ----------
function sarifLevelFromSeverity(sev) {
  if (sev === "FAIL") return "error";
  if (sev === "WARN") return "warning";
  return "note";
}

function buildSarif(report) {
  const toolName = "skills-security-scan";

  // Collect rules from findings (unique by ruleId)
  const rulesMap = new Map();
  for (const f of report.findings || []) {
    const ruleId = f.ruleId || "unknown";
    if (rulesMap.has(ruleId)) continue;
    rulesMap.set(ruleId, {
      id: ruleId,
      name: ruleId,
      shortDescription: { text: ruleId },
    });
  }

  const results = (report.findings || []).map((f) => {
    const ruleId = f.ruleId || "unknown";

    const region = f.line
      ? {
          startLine: Number(f.line),
          startColumn: 1,
        }
      : undefined;

    const physicalLocation = {
      artifactLocation: { uri: f.file },
      ...(region ? { region } : {}),
    };

    return {
      ruleId,
      level: sarifLevelFromSeverity(f.severity),
      message: { text: f.message || ruleId },
      locations: [{ physicalLocation }],
      // Extra metadata helps the UI + triage; safe to include
      properties: {
        skill: f.skill,
        severity: f.severity,
      },
      ...(f.snippet
        ? {
            partialFingerprints: {
              // lightweight stable-ish string for dedupe
              snippet: String(f.snippet).slice(0, 200),
            },
          }
        : {}),
    };
  });

  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: toolName,
            rules: Array.from(rulesMap.values()),
          },
        },
        results,
      },
    ],
  };
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

    if (EFFECTIVE_SARIF_PATH) {
      ensureDir(EFFECTIVE_SARIF_PATH);
      fs.writeFileSync(EFFECTIVE_SARIF_PATH, JSON.stringify(buildSarif(report), null, 2), "utf8");
      console.log(`🧾 Wrote SARIF: ${path.relative(REPO_ROOT, EFFECTIVE_SARIF_PATH)}`);
    }

    process.exit(0);
  }

  for (const skillName of skillDirs) {
    const files = walkDir(path.join(SKILLS_ROOT, skillName), skillName);

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
            report.findings.push({
              severity: "WARN",
              skill: skillName,
              file: pkgFile.rel,
              ruleId: PACKAGE_JSON_WARN_RULE,
              message: `package.json contains lifecycle scripts: ${hookKeys.join(", ")} (review required)`,
            });

            for (const key of hookKeys) {
              const value = String(scripts[key] ?? "");
              for (const p of FAIL_PATTERNS) {
                if (p.re.test(value)) {
                  report.findings.push({
                    severity: "FAIL",
                    skill: skillName,
                    file: pkgFile.rel,
                    ruleId: PACKAGE_JSON_FAIL_RULE,
                    message: `Lifecycle script "${key}" contains blocked remote-exec pattern (${p.id})`,
                    snippet: value.length > 240 ? value.slice(0, 240) + "…" : value,
                  });
                }
              }
            }
          }
        }
      } catch (e) {
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

      for (const p of FAIL_PATTERNS) {
        const hits = findAllMatchesWithContext(content, p.re);
        for (const h of hits) {
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

      let injectionWarnHit = false;
      for (const p of WARN_PATTERNS) {
        const hits = findAllMatchesWithContext(content, p.re);
        if (hits.length > 0 && p.id.startsWith("prompt-injection:")) injectionWarnHit = true;

        for (const h of hits) {
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

      if (injectionWarnHit) {
        for (const re of SENSITIVE_TARGETS) {
          if (re.test(content)) {
            const sensitiveHits = findAllMatchesWithContext(content, re);
            const h = sensitiveHits[0];

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

  report.findings = normalizeFindings(report.findings);

  report.totals.warnings = report.findings.filter((f) => f.severity === "WARN").length;
  report.totals.failures = report.findings.filter((f) => f.severity === "FAIL").length;

  if (report.totals.failures > 0) report.status = "FAIL";
  else if (report.totals.warnings > 0) report.status = "WARN";

  // Write JSON report
  ensureDir(EFFECTIVE_REPORT_PATH);
  fs.writeFileSync(EFFECTIVE_REPORT_PATH, JSON.stringify(report, null, 2), "utf8");

  console.log(`✅ Wrote security report: ${path.relative(REPO_ROOT, EFFECTIVE_REPORT_PATH)}`);
  console.log(
    `📊 Status: ${report.status} | FAIL=${report.totals.failures} WARN=${report.totals.warnings} FILES=${report.totals.scannedFiles}`
  );

  // Write SARIF (optional, only if --sarif provided)
  if (EFFECTIVE_SARIF_PATH) {
    ensureDir(EFFECTIVE_SARIF_PATH);
    fs.writeFileSync(EFFECTIVE_SARIF_PATH, JSON.stringify(buildSarif(report), null, 2), "utf8");
    console.log(`🧾 Wrote SARIF: ${path.relative(REPO_ROOT, EFFECTIVE_SARIF_PATH)}`);
  }

  process.exit(report.status === "FAIL" ? 1 : 0);
}

main();
