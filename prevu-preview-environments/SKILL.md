---
name: prevu-preview-environments
description: Create and debug Prevu preview environments with VM-backed staging, public HTTPS URLs, SSH, services, and logs for coding-agent review loops
author: prevu-cloud
version: "1.0"
tags:
  - prevu
  - preview
  - staging
  - agents
  - devops
  - cli
---

# Prevu Preview Environments

## Purpose

This skill guides an agent through using Prevu as a preview environment layer
for coding-agent work. Prevu gives agents a real VM-backed environment, SSH
access, service inspection, logs, and public HTTPS preview URLs so humans can
review running software before production.

Use this skill when the task involves:

- Creating or managing a Prevu environment.
- Running work-in-progress code in a real staging VM.
- Exposing a running app as a public HTTPS preview URL.
- Sharing a preview link with a teammate, designer, PM, or mobile reviewer.
- Debugging a Prevu environment with SSH, service status, ports, and logs.

Do not present Prevu as a production deployment target unless the user
explicitly asks about production. Treat it as a staging and review surface.

## Preconditions

- The Prevu CLI is installed or can be installed.
- The user is signed in with `prevu auth login`, or an approved `PREVU_TOKEN` is
  already available in automation.
- The app can bind to a network-accessible host such as `0.0.0.0`.

## Install and Authenticate

```bash
npm install -g @prevu/cli
prevu auth status
```

If auth is missing:

```bash
prevu auth login
```

Do not create new access tokens or paste secrets into logs, public URLs, issue
comments, or documentation without explicit approval.

## Create or Select an Environment

List existing environments first when the user may already have one:

```bash
prevu env list
```

Create a new environment with a short slug:

```bash
prevu env create my-app-preview
```

## Debug Through SSH

SSH into the environment when setup or runtime inspection is needed:

```bash
prevu env ssh my-app-preview
```

Inside the VM, check the working directory, processes, listening ports, and local
HTTP response before changing configuration:

```bash
pwd
ls
ps aux
ss -ltnp
curl -I http://127.0.0.1:3000
```

## Expose the App

Expose the port the app actually listens on:

```bash
prevu env expose my-app-preview --port 3000
```

Return the generated HTTPS URL to the user and identify what is running:

```text
Preview URL: https://my-app-preview-3000.prevu.page
Running: development server on port 3000
Ready for: teammate review, mobile review, PM signoff
```

## Inspect Services and Logs

Before restarting or rebuilding, inspect service state and logs:

```bash
prevu env services my-app-preview
prevu env logs my-app-preview
```

Prefer a service-specific log command when the CLI provides one.

## Common Fixes

If the preview URL returns a blocked-host error, update the framework dev server
configuration to allow the Prevu hostname. For Vite projects, this usually means
setting `server.allowedHosts` in `vite.config.ts`.

If the port is not reachable, confirm the app is listening on the expected port
and is not bound only to an inaccessible interface.

If a private repository cannot be cloned inside the VM, use an approved access
path such as an existing local archive or authenticated GitHub CLI flow. Do not
create new credentials without approval.

## Verification

- [ ] The environment exists and is reachable through the Prevu CLI.
- [ ] The app process is running in the environment.
- [ ] The intended port is listening.
- [ ] The public HTTPS preview URL returns the expected app.
- [ ] The user receives the exact preview URL and any known caveats.

## Cleanup

Ask before deleting environments unless the user already authorized cleanup:

```bash
prevu env delete my-app-preview
```
