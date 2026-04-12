# Install

## What you need

1. a local checkout of `agent-exporter`
2. `python3`
3. either:
   - `target/release/agent-exporter`
   - `target/debug/agent-exporter`
   - or a working `cargo` toolchain

The bridge script is:

```text
/absolute/path/to/agent-exporter/scripts/agent_exporter_mcp.py
```

## OpenHands-style MCP config

Use `OPENHANDS_MCP_CONFIG.json` as the starting point.

## OpenClaw-style MCP config

Use `OPENCLAW_MCP_CONFIG.json` as the starting point.

## Important boundary

- local stdio only
- repo checkout required
- no hosted service
- no auto-install into a live host root

## First attach check

After wiring the bridge, use one low-risk tool call first:

- `integration_evidence_policy_list`

That proves the bridge is attached before you ask it to work on a workspace.

