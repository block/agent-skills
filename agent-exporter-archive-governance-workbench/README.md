# agent-exporter Archive Governance Workbench Public Skill

This folder is a host-native public skill packet for `agent-exporter`.

The flagship public story is still:

- GitHub repo front door
- CLI quickstart
- archive shell proof

The product behind this packet is still a **local-first archive and governance workbench**.
Its primary surface remains **`CLI-first`**.

This packet exists for host-native reviewers who need a **self-contained**
folder that explains how to wire the local stdio MCP bridge and use the
read-only archive/governance workflow without treating the repo like a hosted
service.

## What this skill teaches

This packet teaches an agent how to:

1. wire the local stdio MCP bridge from a repo checkout
2. prove the bridge on a safe first-success path before making bigger claims
3. publish a local archive shell
4. run semantic or hybrid retrieval and save local reports
5. inspect governance evidence, policy packs, and baseline history
6. keep archive browsing, retrieval execution, and governance reading in the
   correct lanes

## What this packet includes

- `SKILL.md`
- `manifest.yaml`
- `references/README.md`
- `references/INSTALL.md`
- `references/OPENHANDS_MCP_CONFIG.json`
- `references/OPENCLAW_MCP_CONFIG.json`
- `references/CAPABILITIES.md`
- `references/DEMO.md`
- `references/TROUBLESHOOTING.md`

## First-success path

1. read `SKILL.md`
2. wire the bridge from `references/INSTALL.md`
3. run the safe attach/proof flow in `references/DEMO.md`
4. inspect the proof links before claiming host-side listing or acceptance

## Proof links

- Landing: https://xiaojiou176-open.github.io/agent-exporter/
- Archive shell proof: https://xiaojiou176-open.github.io/agent-exporter/archive-shell-proof.html
- Repo map: https://xiaojiou176-open.github.io/agent-exporter/repo-map/
- Releases: https://github.com/xiaojiou176-open/agent-exporter/releases

## Current registry truth

- `ClawHub`: `listed-live`
  - fresh read-back: `clawhub inspect agent-exporter-archive-governance-workbench --no-input`
- `OpenHands/extensions`: `review-pending`
  - submission ref: `https://github.com/OpenHands/extensions/pull/162`

## MCP capability surface

- archive shell:
  - `publish_archive_index`
- retrieval:
  - `search_semantic`
  - `search_hybrid`
- integration evidence:
  - `integration_evidence_diff`
  - `integration_evidence_gate`
  - `integration_evidence_explain`
  - `integration_evidence_remediation`
- governance registry:
  - `integration_evidence_baseline_list`
  - `integration_evidence_baseline_show`
  - `integration_evidence_policy_list`
  - `integration_evidence_policy_show`
  - `integration_evidence_decision_history`
  - `integration_evidence_current_decision`

## Best-fit hosts

- OpenHands/extensions-style skill folders
- ClawHub-style skill publication
- repo-local host workflows that can launch a local stdio server
- bundle/plugin flows that need a separate explanation packet

## What this packet must not claim

- no hosted archive platform
- no listed-live OpenHands/extensions entry while the PR is still open
- no full-CLI MCP parity
- no change to the flagship `CLI-first` primary surface

## Source of truth

This is a public-facing derived packet.
Canonical product truth still lives in:

- `README.md`
- `AGENTS.md`
- `docs/integrations/`
