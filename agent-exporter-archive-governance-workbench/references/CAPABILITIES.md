# Capabilities

The public bridge is intentionally narrow.

## Archive lane

- `publish_archive_index`
  - generate the local archive shell and reports shell for a workspace

## Retrieval lane

- `search_semantic`
- `search_hybrid`

These save or explain local retrieval work.
They do not turn the browser surface into a retrieval executor.

## Governance lane

- `integration_evidence_diff`
- `integration_evidence_gate`
- `integration_evidence_explain`
- `integration_evidence_remediation`
- `integration_evidence_baseline_list`
- `integration_evidence_baseline_show`
- `integration_evidence_policy_list`
- `integration_evidence_policy_show`
- `integration_evidence_decision_history`
- `integration_evidence_current_decision`

## Boundaries

- local stdio bridge only
- repo checkout required
- read-mostly governance surface
- no hosted multi-user archive platform
- no full CLI parity claim

