# Provenote MCP Outcome Workflows Public Skill

This folder is the public, self-contained skill packet for Provenote.
It is designed to carry install, config, capability, and demo material inside
the skill folder instead of pushing that burden back to repo-root docs.

It is the public skill companion to Provenote's first-party MCP carry-forward
lane. Reviewers should still understand the product in this order:
outcome-first workbench first, first-party MCP second, then this standalone
skill packet for host-native submission flows.

## Purpose

Use it when you want one portable skill folder that teaches four things clearly:

- how to install and launch the first-party `provenote-mcp` server
- how to wire it into OpenHands or OpenClaw
- what MCP tool families Provenote exposes
- what a read-first outcome workflow looks like in practice

## What this packet includes

- `SKILL.md`
  - the agent-facing workflow prompt
- `manifest.yaml`
  - listing metadata for registry-style distribution
- `references/INSTALL.md`
  - install and host wiring guide
- `references/CAPABILITIES.md`
  - exposed MCP tools and recommended first-use path
- `references/DEMO.md`
  - exact demo prompts and success criteria
- `references/OPENHANDS_MCP_CONFIG.json`
  - host config snippet for `mcpServers`
- `references/OPENCLAW_MCP_CONFIG.json`
  - host config snippet for `mcp.servers`
- `references/TROUBLESHOOTING.md`
  - first-failure checks for launch, empty workspaces, and narrow write steps

## Best-fit hosts

- OpenHands/extensions contribution flow
- ClawHub-style skill publication
- repo-local skill import flows that expect a standalone folder with its own
  install and demo references

## Current repo-backed state

- this packet keeps install, config, capability, demo, and troubleshooting
  material inside one portable folder around the first-party `provenote-mcp`
- the OpenHands/extensions submission currently has reviewer-requested changes at
  `OpenHands/extensions#154`
- ClawHub and Official MCP Registry listing claims stay outside this packet
  until separate host-side or registry read-back is attached

## What this packet must not claim

- no live OpenHands/extensions listing without fresh PR/read-back
- no live ClawHub or Official MCP Registry listing inferred from this folder alone
- no official marketplace or directory listing by itself
- no replacement of the first-party `provenote-mcp` server

## Source of truth

Keep this packet aligned with the source repo, but do not make reviewers depend
on repo-root docs before they can understand the skill:

- `docs/distribution.md`
- `docs/project-status.md`
- `server.json`
- `examples/hosts/openclaw/clawhub/provenote-mcp-outcome-workflows/SKILL.md`
