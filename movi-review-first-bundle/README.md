# Movi Review-First Bundle Public Skill

Status: `ClawHub listed_live (current page still shows suspicious.vt_suspicious); OpenHands/extensions#161 review pending`

This folder is the current public, self-contained skill packet for Movi.

The canonical public root for the product still lives at the repo root:
`../../README.md` plus `../../manifest.yaml`.
The canonical machine-readable descriptor for the pure-MCP lane now lives at
`../../server.json`.

It is meant to travel into OpenHands- or ClawHub-style review flows without
forcing the reviewer to reopen the whole repo first.

## Purpose

Use it when you want one portable skill folder that teaches five things inside
the packet itself:

- what Movi helps an agent do
- how to install and attach the local Movi MCP server
- which tools are safe first for review-first batch work
- what one good first-success path looks like
- what the packet must not claim

## What this packet includes

- `SKILL.md`
  - the agent-facing workflow brief
- `manifest.yaml`
  - packet metadata and truthful listing boundary
- `references/README.md`
  - quick map of the local reference files
- `references/INSTALL.md`
  - install and attach walkthrough
- `references/OPENHANDS_MCP_CONFIG.json`
  - host config snippet for OpenHands-style `mcpServers`
- `references/OPENCLAW_MCP_CONFIG.json`
  - host config snippet for OpenClaw-style `mcp.servers`
- `references/CAPABILITIES.md`
  - exact Movi tool surface and safe-first order
- `references/DEMO.md`
  - first-success prompt plus expected tool sequence
- `references/TROUBLESHOOTING.md`
  - attach, proof, and runtime failure checks

## Best-fit hosts

- OpenHands/extensions contribution flow
- ClawHub-style skill publication
- repo-local skill import flows that expect one standalone folder with its own
  install, capability, and demo notes

## Current state

- the repo-owned packet is ready for review-first host-native evaluation
- the current ClawHub lane is listed live, but the page still shows `Moderation verdict: suspicious` and `Detected: suspicious.vt_suspicious`
- the current OpenHands/extensions lane is `#161` and remains `OPEN / REVIEW_REQUIRED / BLOCKED`
- the Official MCP Registry lane remains `not_submitted`
- the packet does not claim a live OpenHands acceptance or an official OpenClaw catalog approval

## What this packet must not claim

- no accepted OpenHands listing without fresh PR/read-back
- no clean ClawHub approval beyond the current suspicious moderation warning
- no official MCP Registry submission
- no browser-extension marketplace listing
- no hosted Movi SaaS or hidden execute shortcut

## Existing repo-owned helper files

This packet still ships the repo-owned helper files below because they are
useful during review:

- `codex.mcp.json`
- `claude-code.mcp.json`
- `openclaw.mcp.json`
- `install-and-proof.md`

They are helper artifacts, not evidence of clean approval across every host lane.
