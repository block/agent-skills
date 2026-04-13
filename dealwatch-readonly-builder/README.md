# DealWatch Read-only Builder

This bundle teaches an agent how to connect the published DealWatch MCP package
and use its read-only tools safely.

## What the agent learns here

- how to install the published `dealwatch==1.0.1` MCP package
- which DealWatch MCP tools exist and which three are safe-first
- how to choose between runtime-readiness, builder-starter, compare, watch, and
  recovery reads
- which claims stay out of bounds

## Included files

- `SKILL.md` — the progressive-disclosure prompt for the agent
- `references/mcp-install.md` — exact install snippets for OpenHands/OpenClaw
- `references/tool-map.md` — read-only tool inventory and when to use each tool
- `references/example-tasks.md` — example user asks and expected return shape
- `manifest.yaml` — registry metadata used by hosts such as ClawHub

## The shortest install path

Use the published package, not a repo-local checkout:

```bash
uvx --from dealwatch==1.0.1 dealwatch-mcp serve
```

If the host needs a saved MCP config snippet, use the host-specific examples in
`references/mcp-install.md`.

## Hard boundaries

- no hosted DealWatch control plane
- no write-side MCP surface
- no autonomous recommendation claim
- no first-party marketplace claim unless that host independently confirms it
