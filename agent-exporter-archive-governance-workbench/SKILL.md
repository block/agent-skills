---
name: agent-exporter-archive-governance-workbench
description: Use when an agent needs to wire the local agent-exporter MCP bridge, publish a local archive shell, save retrieval reports, or read governance evidence and policy packs from a repo checkout. This packet teaches the local stdio bridge path and the archive/retrieval/governance lane split without overclaiming hosted or listed-live status.
author: xiaojiou176
version: "1.0.0"
tags:
  - archive
  - governance
  - retrieval
  - mcp
  - local-first
triggers:
  - agent-exporter
  - archive shell
  - governance evidence
  - semantic retrieval
  - hybrid retrieval
  - local stdio mcp
---

# agent-exporter Archive Governance Workbench

Use this skill when an agent needs to attach the local `agent-exporter` bridge
from a repo checkout and operate the archive/retrieval/governance workflow
through a host-native packet.

## What this skill teaches

- how to attach the local stdio MCP bridge
- how to prove the bridge on a safe first-success path
- how to publish a local archive shell
- how to save local retrieval reports
- how to read governance evidence without pretending there is a hosted platform

## Product truth

- `agent-exporter` is a local-first archive and governance workbench
- the current primary surface is still `CLI-first`
- this public skill packet is a secondary public lane
- the bridge exposes read-mostly archive, retrieval, and governance tools
- the browser pages organize proof; they do not execute retrieval or onboarding

## Current registry truth

- `ClawHub`: `listed-live`
  - fresh read-back: `clawhub inspect agent-exporter-archive-governance-workbench --no-input`
- `OpenHands/extensions`: `review-pending`
  - submission ref: `https://github.com/OpenHands/extensions/pull/162`

## First-success flow

1. Follow `references/INSTALL.md` and wire the bridge from a repo checkout.
2. Call `integration_evidence_policy_list` to prove the bridge can answer a
   no-risk governance read.
3. If you have a workspace with transcript HTML receipts, call
   `publish_archive_index` on that workspace.
4. Only after the bridge works, move to retrieval or evidence comparison.

## Preferred evidence order

1. `references/INSTALL.md`
2. `references/DEMO.md`
3. `references/CAPABILITIES.md`
4. `references/TROUBLESHOOTING.md`

## Example prompts

- "Wire the local agent-exporter bridge and show me the available governance policies."
- "Publish the archive shell for this workspace and tell me where the archive shell landed."
- "Run semantic retrieval for this workspace and save a local report."
- "Compare two saved integration evidence snapshots and explain the readiness delta."

## Truth language

- Good: "local stdio bridge"
- Good: "secondary public lane"
- Good: "archive and governance workbench"
- Forbidden: "hosted platform"
- Forbidden: "listed-live skill" without fresh host read-back
- Forbidden: "full CLI exposed through MCP"

## Read next

- `references/README.md`
- `references/INSTALL.md`
- `references/CAPABILITIES.md`
- `references/DEMO.md`
- `references/TROUBLESHOOTING.md`
