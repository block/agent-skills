# Prompt Switchboard Compare Workflows Public Skill

This folder is the public, self-contained skill packet for Prompt Switchboard.
It is meant to travel into host skill registries without forcing the reviewer to
read the whole source repository first.

It is the public skill companion to the browser-first compare workspace. The
product order stays the same: extension install first, compare workflow second,
then this standalone skill packet for host-native submission flows.

## Purpose

Use it when you want one portable skill folder that teaches four things inside
the skill package itself:

- how to install the local MCP sidecar
- how to wire that MCP server into OpenHands or OpenClaw
- what MCP tools Prompt Switchboard exposes
- what a good first compare workflow looks like in practice

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
  - first-failure checks for bridge, readiness, and compare execution

## Best-fit hosts

- OpenHands/extensions contribution flow
- ClawHub-style skill publication
- repo-local skill import flows that expect a standalone folder with its own
  install and demo references

## Current repo-backed state

- this packet is self-contained and keeps install, config, capability, demo,
  and troubleshooting material inside one portable folder
- the OpenHands/extensions submission currently has reviewer-requested changes at
  `OpenHands/extensions#154`
- ClawHub and Official MCP Registry listing claims stay outside this packet
  until separate host-side or registry read-back is attached

## What this packet must not claim

- no live OpenHands/extensions listing without fresh PR/read-back
- no live ClawHub or Official MCP Registry listing inferred from this folder alone
- no hosted Glama deployment, Docker catalog listing, or public relay claim
- no `listed everywhere` claim that hides changes-requested or review-pending state

## Source of truth

This folder is a public-facing derived packet. Keep it aligned with the source
repo, but do not make reviewers rely on repo-root docs to understand the skill:

- `README.md`
- `docs/mcp-coding-agents.html`
- `server.json`

If the product boundary or MCP workflow changes, update this packet before
submitting it again.
