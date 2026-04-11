---
name: switchyard-runtime-diagnostics
description: Diagnose one provider or runtime boundary through Switchyard's read-only MCP runtime diagnostics surface.
author: xiaojiou176
version: "1.0"
tags:
- switchyard
- mcp
- diagnostics
- runtime
- read-only
---

# Switchyard Runtime Diagnostics

Teach an agent how to install, connect, and use Switchyard's read-only MCP runtime diagnostics surface.

## Use this skill when

- the user wants to diagnose one provider or runtime boundary
- the host can run the local `stdio` MCP server
- the agent needs read-only runtime and catalog truth before any human action

## What this skill teaches

- how to attach the current Switchyard MCP server
- which runtime and catalog tools are safest first
- how to separate internal blockers from external blockers
- how to keep claims grounded in `partial`, `read-only`, and `package-ready`

## Start here

1. Run the current MCP surface from a local checkout.

```bash
pnpm run switchyard:mcp
```

2. Point the host to the current package command instead of inventing a hosted endpoint.

```json
{
  "mcpServers": {
    "switchyard": {
      "command": "pnpm",
      "args": ["run", "switchyard:mcp"],
      "cwd": "/absolute/path/to/Switchyard"
    }
  }
}
```

3. Inspect runtime and catalog truth before making outward claims.

## Safe-first workflow

1. connect to the local read-only MCP surface
2. inspect runtime/catalog truth first
3. confirm whether the issue is repo-owned, external-only, or owner-only later
4. only then escalate toward browser/session or publication lanes

## Guardrails

- do not write to external accounts
- do not turn `partial` into `supported`
- do not turn `auth ready` into `listed-live`
- do not describe the skill page as proof that Switchyard core runtime is marketplace-live

## Verification

- the MCP process starts from a local checkout
- the host can list the read-only runtime/catalog tools
- the agent can describe the current lane truth without overclaiming npm, registry, or marketplace publication
