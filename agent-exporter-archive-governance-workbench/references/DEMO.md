# Demo

## Safe first success

Start with the smallest proof path:

1. attach the bridge with one of the config snippets
2. call `integration_evidence_policy_list`
3. confirm the reply lists repo-owned policy packs

Expected outcome:

- the host can talk to `agent-exporter`
- the bridge responds with governance data
- no hosted or listing claim is needed

## Workspace proof path

If you already have a workspace with transcript HTML receipts:

1. call `publish_archive_index`
2. point it at your workspace root
3. open the returned archive shell path

Expected outcome:

- archive shell path
- reports shell path
- transcript count

## Retrieval proof path

If the workspace already has searchable transcript artifacts:

1. call `search_semantic`
2. or call `search_hybrid`
3. save the report

Expected outcome:

- query string
- top hits
- saved report path

## Example prompts

- "List the available governance policy packs from this repo checkout."
- "Publish the archive shell for this workspace and tell me where it landed."
- "Run hybrid retrieval for this workspace and save a report."
- "Explain the remediation sequence for this integration evidence report."

