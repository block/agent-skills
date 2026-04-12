---
name: prooftrail-mcp
description: Install and use ProofTrail as a governed local stdio MCP layer for browser evidence, retained proof, and recovery-first agent workflows.
author: xiaojiou176
version: "1.0.0"
tags:
  - mcp
  - browser-evidence
  - recovery
  - proof
  - local-first
---

# ProofTrail MCP

## Purpose

Use this skill when an agent needs a governed browser-evidence layer instead of a generic browser bot story.

ProofTrail is best understood as a recovery-first inspection surface:
- inspect retained evidence from one canonical run
- confirm what happened before retrying anything
- only widen into active automation after the read and proof surfaces are clear

## When To Use

Use this skill when:
- the repo is available locally
- the host can attach a local stdio MCP server
- the user wants browser evidence, retained proof, or recovery guidance
- you need honest boundaries about what is live and what is still blocked upstream

Do not use this skill to claim:
- a hosted MCP endpoint
- a live npm package for `@prooftrail/mcp-server`
- a live Official MCP Registry listing
- a live OpenHands marketplace listing

## Product Truth

ProofTrail is an evidence-first browser automation and recovery layer.

Today the honest install road is:
1. local checkout
2. `pnpm install`
3. attach the repo-local stdio MCP bridge
4. start with read/proof tools before active run tools

## Install

1. Clone the repo:
   - `git clone https://github.com/xiaojiou176-open/prooftrail.git`
2. Install dependencies:
   - `cd prooftrail`
   - `pnpm install`
3. Start the MCP server from the repo root:
   - `pnpm mcp:start`
4. Point your MCP host at the local stdio command.

Minimal config shape:

```json
{
  "mcpServers": {
    "prooftrail": {
      "command": "pnpm",
      "args": ["mcp:start"],
      "cwd": "/absolute/path/to/prooftrail"
    }
  }
}
```

Optional env forwarding can include:
- `UIQ_MCP_API_BASE_URL`
- `UIQ_MCP_AUTOMATION_TOKEN`

## Safe-First Workflow

Use tools in this order:
1. catalog / surface discovery
2. read / quality-read
3. proof / report
4. only then run / run-and-report / API automation

The everyday rule is simple: read first, prove second, automate third.

## First Success Path

1. Attach the local MCP bridge.
2. Confirm the tool surface is visible.
3. Inspect one retained run or failure surface.
4. Summarize the strongest next action from evidence, not guesswork.

A good first prompt is:

> Use ProofTrail as a governed browser-evidence layer. Start with the catalog, then inspect one retained run or failure surface. Show the most important proof signal before suggesting any rerun.

## Current External Truth

- ClawHub discovery page is live for this packet: `https://clawhub.ai/skills/prooftrail-mcp`
- Cline marketplace intake is open: `https://github.com/cline/mcp-marketplace/issues/1322`
- OpenHands/extensions is **not** a live listing today; PR `#161` was closed with maintainer guidance to distribute a custom `marketplace.json` instead
- Official MCP Registry is still blocked because the npm package is not published upstream
- Smithery is not honest today because there is no public HTTPS MCP runtime
- HiMarket is not honest today because there is no Higress-ready `mcp-server.yaml`

## References

- Repo: `https://github.com/xiaojiou176-open/prooftrail`
- Install guide: `https://github.com/xiaojiou176-open/prooftrail/blob/main/llms-install.md`
- Distribution contract: `https://github.com/xiaojiou176-open/prooftrail/blob/main/docs/reference/mcp-distribution-contract.md`
- Listings cockpit: `https://github.com/xiaojiou176-open/prooftrail/blob/main/docs/release/mcp-listings-cockpit.md`

## Boundaries

- This skill teaches a local stdio MCP attach path.
- It does not turn ProofTrail into a hosted service.
- It does not prove generic cross-host marketplace acceptance.
- It does not replace the repo README or distribution ledger as the source of truth for publication status.
