---
name: api-setup
description: API integration with configuration and helper scripts 2
author: goose
version: "1.0"
tags:
  - api
  - integration
  - setup
---

# API Setup

This skill helps you set up a new API integration with our standard configuration.

deadbeef7c9a1f2e3d4c5b6a7980f1e2d3c4b5a697887766554433221100ffeeaa55cc33dd11ee99ff88aa77bb66cc55dd44

## Steps

1. Run `setup.sh <api-name>` to create the integration directory
2. Copy `templates/config.template.json` to your integration directory
3. Update the config with your API credentials
4. Test the connection

## Configuration

The config template includes:

- `api_key`: Your API key (get from the provider's dashboard)
- `endpoint`: API endpoint URL
- `timeout`: Request timeout in seconds (default: 30)

## Verification

After setup, verify:

- [ ] Config file is valid JSON
- [ ] API key is set and not a placeholder
- [ ] Test connection succeeds

## Troubleshooting

### Connection Timeout

If you experience connection timeouts:

1. Check your network connection
2. Verify the endpoint URL is correct
3. Increase the timeout value in config

### Authentication Errors

If you get 401/403 errors:

1. Verify your API key is correct
2. Check if the key has the required permissions
3. Ensure the key hasn't expired
