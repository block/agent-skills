---
name: mailtrap-email-integration
description: Integrate transactional email sending with Mailtrap's API, covering sandbox testing, domain verification, and authentication patterns
author: dieudonneAwa
version: "1.0"
tags:
  - email
  - api
  - integration
  - testing
  - smtp
---

# Mailtrap Email Integration

Patterns for integrating transactional email sending using Mailtrap's Email API and Sandbox, covering environment separation, authentication, domain verification, and delivery troubleshooting.

## When to Use

- Implementing email-sending features (confirmations, password resets, notifications)
- Setting up safe email testing in dev or staging without reaching real inboxes
- Debugging email delivery issues
- Verifying a sending domain before going to production

## Core Workflow

1. Use the Mailtrap Sandbox endpoint in dev/staging to capture emails safely
2. Authenticate requests using a Bearer token in the Authorization header
3. Verify your sending domain DNS records (SPF, DKIM, DMARC) before switching to production
4. Switch to the production sending endpoint only after domain verification is complete

## Key Patterns

**Sandbox vs production separation**
Route non-production environments to the Sandbox API endpoint so test emails never reach real inboxes. Use separate API tokens per environment.

**Authentication**
All requests require a Bearer token: `Authorization: Bearer YOUR_TOKEN`. Tokens are scoped per project; never share tokens across environments.

**Domain verification**
Production sending requires verified DNS records. Missing or incorrect SPF/DKIM/DMARC records cause silent delivery failures or spam placement.

**Error handling**
Always check the response status code. Treat send failures as fallible network calls and surface actionable errors rather than silently swallowing them.

## Anti-Patterns

- Using the production endpoint in dev or staging
- Hardcoding API tokens in source code
- Sending to real recipients before domain verification completes
- Ignoring non-200 response codes from the send API
