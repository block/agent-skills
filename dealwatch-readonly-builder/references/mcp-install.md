# Install The Published DealWatch MCP

Use the published PyPI package, not a repo-local `PYTHONPATH=src` shortcut.

## Published package

- package: `dealwatch==1.0.1`
- executable: `dealwatch-mcp`
- transport: `stdio`

## OpenHands example

Add the server to `~/.openhands/config.toml`:

```toml
[mcp]
stdio_servers = [
  { name = "dealwatch", command = "uvx", args = ["--from", "dealwatch==1.0.1", "dealwatch-mcp", "serve"] }
]
```

## OpenClaw example

Add the server to your saved MCP server config:

```json
{
  "mcp": {
    "servers": {
      "dealwatch": {
        "command": "uvx",
        "args": ["--from", "dealwatch==1.0.1", "dealwatch-mcp", "serve"]
      }
    }
  }
}
```

## Smoke check

```bash
uvx --from dealwatch==1.0.1 dealwatch-mcp list-tools --json
```

If that command returns the tool inventory, the published MCP package is wired
correctly.
