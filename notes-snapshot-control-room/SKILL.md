---
name: notes-snapshot-control-room
description: Prove, operate, and attach Apple Notes Snapshot as a local-first backup control room without drifting into hosted-service or fake marketplace claims.
author: xiaojiou176
version: "1.0"
tags:
- apple-notes
- backup
- mcp
- local-first
- diagnostics
---

# Apple Notes Snapshot Control-Room

## Purpose

Use this skill when the user wants to connect Apple Notes Snapshot to a coding
host, troubleshoot why attach proof failed, or explain the difference between
the operator lane and the builder lane.

This skill teaches one honest story:

- Apple Notes Snapshot is a **local-first backup control room for macOS**
- `notesctl` is the canonical human entrypoint
- MCP is a **stdio-first companion lane**
- AI Diagnose and the Local Web API are **secondary surfaces**
- none of that turns the repo into a hosted service or a universal marketplace
  listing

## Best Fit

Use this skill for:

- Codex / Claude Code / local host attach guidance
- local preflight and proof-first troubleshooting
- public-surface wording that must stay control-room-first

Do not use this skill to:

- claim a hosted Notes service
- claim cloud sync or multi-tenant collaboration
- claim an official marketplace listing unless fresh external read-back exists

## First-Success Flow

Think of this like checking a generator before you connect the house. First
prove the machine itself works, then attach optional tooling.

1. Acquire `notesctl` from the public repo checkout or an existing install.
2. Prove the operator lane first:
   - `./notesctl run --no-status`
   - `./notesctl install --minutes 30 --load`
   - `./notesctl verify`
   - `./notesctl doctor`
3. Only after the local loop is healthy, attach the builder lane:
   - `./notesctl ai-diagnose`
   - `./notesctl web`
   - `./notesctl mcp`
4. Keep host proof separate from repo proof.

## Identity Guardrails

Keep these truths explicit:

- product identity: Apple Notes local-first backup control room for macOS
- primary lane: `Run -> Install -> Verify`
- builder lane: optional and secondary
- MCP boundary: local stdio only, read-only-first tools/resources, no hosted runtime

Never collapse these into one sentence:

- local operator proof
- current host attach proof
- registry or marketplace publication

## Preflight Before Any Attach Claim

Do not treat host registration by itself as proof.

Verify this order:

1. `./notesctl run --no-status`
2. `./notesctl verify`
3. `./notesctl doctor --json`
4. `./notesctl status --json`

If these fail, call it a **local snapshot preflight problem**, not an MCP bug.

## MCP Capability Surface

After a healthy local baseline exists, the bounded MCP lane should expose
surfaces such as:

- `get_status`
- `run_doctor`
- `verify_freshness`
- `get_log_health`
- `list_recent_runs`
- `get_access_policy`

First resource to read back:

- `notes-snapshot://recent-runs`

## How To Explain The Three Side Lanes

- `AI Diagnose`
  - advisory troubleshooting helper on top of the same local backup facts
- `Local Web API`
  - token-gated same-machine surface, not a hosted API
- `MCP`
  - stdio-first local agent surface, not a remote service

If someone asks "which one is the real product", answer:

> the control room is the product; AI Diagnose, Local Web API, and MCP are
> adapter lanes around the same local workflow.

## Honest Distribution Boundary

Keep wording precise:

- repo-owned starter packs and local marketplaces are public-ready wiring kits
- they are not the same thing as official public directory listing
- a tagged attach-proof trail on one machine is not universal proof on every machine

## Verification Checklist

- [ ] one local `run -> install -> verify -> doctor` pass is documented or completed
- [ ] attach claims stay local-first and stdio-first
- [ ] wording does not drift into hosted-service or universal-marketplace claims
- [ ] AI Diagnose, Local Web API, and MCP remain distinct in the explanation

## Troubleshooting

If the user says attach failed:

1. Ask whether `./notesctl run --no-status` completed at least once.
2. Ask whether `./notesctl verify` passes.
3. Ask whether `./notesctl doctor` reports permission or scheduler issues.
4. Only after that inspect host-specific MCP wiring.

If the user says the product sounds too complicated:

1. reduce the story back to `Run -> Install -> Verify`
2. explain MCP as a second-ring lane
3. avoid leading with AI Diagnose or Local Web API

## Public References

- Repo: `https://github.com/xiaojiou176-open/apple-notes-snapshot`
- Quickstart: `https://xiaojiou176-open.github.io/apple-notes-snapshot/quickstart/`
- Proof page: `https://xiaojiou176-open.github.io/apple-notes-snapshot/proof/`
- MCP guide: `https://xiaojiou176-open.github.io/apple-notes-snapshot/mcp/`
- Public skill packet source:
  `https://github.com/xiaojiou176-open/apple-notes-snapshot/tree/main/examples/public-skills/notes-snapshot-control-room`
