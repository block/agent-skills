---
name: hermes-tweet
description: Use Hermes Tweet from Hermes Agent for read-first X/Twitter workflows and approval-gated actions
author: Xquik-dev
version: "1.0"
tags:
  - hermes
  - x
  - twitter
  - social
  - automation
---

# Hermes Tweet

## Purpose

Use this skill when a Hermes Agent session needs X/Twitter search, account
reads, trend checks, support triage, launch monitoring, or controlled publishing
through the Hermes Tweet plugin.

Source package: <https://github.com/Xquik-dev/hermes-tweet>

## Preconditions

- Hermes Agent is installed.
- Hermes Tweet is installed and enabled:
  `hermes plugins install Xquik-dev/hermes-tweet --enable`
- `XQUIK_API_KEY` is configured only where the Hermes runtime executes plugin
  tools, such as the runtime environment or `~/.hermes/.env`.
- `HERMES_TWEET_ENABLE_ACTIONS=true` is set only for sessions where the user has
  explicitly requested write-like actions.

## Tool Boundaries

- Use `tweet_explore` first to discover supported endpoints. It does not need
  `XQUIK_API_KEY`.
- Use `tweet_read` only for catalog-listed read-only endpoints.
- Use `tweet_action` only for writes, private reads, monitors, webhooks,
  extraction jobs, or draws after the user approves the exact action.
- If `tweet_action` is unavailable, keep the workflow read-only instead of
  inventing a fallback.

## Workflow

1. Restate the X/Twitter task and identify whether it is read-only or
   write-like.
2. Call `tweet_explore` with a short capability or endpoint query.
3. Choose only endpoints returned by the catalog.
4. Call `tweet_read` for public, read-only work.
5. For posting, replies, likes, follows, DMs, monitors, webhooks, extraction
   jobs, or draws, show the endpoint and payload first.
6. Call `tweet_action` only after the user approves that exact endpoint and
   payload.
7. Summarize the result, including whether the task stayed read-only or used an
   approved action.

## Safety Rules

- Do not pass credentials, cookies, tokens, or account secrets as tool
  arguments.
- Do not guess endpoint paths. Use the catalog from `tweet_explore`.
- Do not treat plugin installation as action authorization.
- Do not enable action mode for monitoring, support triage, trend reads, or
  account reads unless the user explicitly asks for a write-like operation.
- In Hermes Desktop with a remote gateway profile, configure Hermes Tweet on the
  remote Hermes host because that is where plugin tools run.

## Verification

After installation or upgrade:

- [ ] `hermes plugins list` shows `hermes-tweet` installed and enabled.
- [ ] `tweet_explore` is available without `XQUIK_API_KEY`.
- [ ] `tweet_read` appears after `XQUIK_API_KEY` is configured and Hermes is
      reloaded or restarted.
- [ ] `tweet_action` stays hidden or disabled unless
      `HERMES_TWEET_ENABLE_ACTIONS=true`.
