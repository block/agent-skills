# Troubleshooting

## The host cannot start the bridge

Check:

1. `python3` exists
2. the absolute path to `scripts/agent_exporter_mcp.py` is correct
3. the repo checkout still exists at that path

## The bridge starts but tools fail

Check:

1. repo-local binary exists under `target/release` or `target/debug`
2. or `cargo` is available
3. the host is not trying to run against a deleted checkout

## Archive shell proof fails

Check:

1. the workspace already has transcript HTML receipts
2. the workspace root path is correct
3. you are not expecting a hosted archive page

## Retrieval tools fail

Check:

1. the workspace has archive content to search
2. local model assets exist when required
3. you are not expecting the browser page to run retrieval for you

## Governance tools fail

Check:

1. the workspace path is correct for baseline/history calls
2. the report paths exist for diff/explain/remediation calls
3. you are staying on the read-only governance surface, not asking for live host mutation
