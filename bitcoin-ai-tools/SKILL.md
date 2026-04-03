---
name: bitcoin-ai-tools
description: Access 33+ AI services (image, video, audio, OCR, translation, communication) by paying per request with Bitcoin Lightning — no API keys or signups required.
author: cnghockey
version: "1.0"
tags:
  - ai
  - bitcoin
  - lightning
  - payments
  - image-generation
  - audio
  - video
  - no-signup
---

# Bitcoin AI Tools (Sats4AI)

## Purpose

Use Sats4AI to call specialized AI services — image generation, background removal, TTS, transcription, video, OCR, translation, file conversion, SMS, email, phone calls, and more — paying per request with Bitcoin Lightning micropayments. No API keys, no accounts, no KYC.

## Preconditions

- A Lightning wallet with sats (any wallet: Phoenix, Wallet of Satoshi, Alby, etc.)
- Goose with the Sats4AI MCP server configured, OR direct access to the MCP endpoint

### Add to Goose

The Sats4AI server is a remote streamable-http MCP — no install required:

\
Or install via npm:

\
## Payment Flow

Every tool requires a Lightning micropayment before it runs. The flow is always the same:

1. Call  with the tool name and any required parameters → get a Lightning invoice + 2. Pay the invoice with any Lightning wallet (confirms in seconds)
3. Call  → wait for 4. Call the tool with  → get the result

Payments are single-use. If the service fails, the payment is marked refundable — call .

## Available Tools

### Discovery
-  — browse all tools with pricing (free)
-  — check price for a specific tool (free)
-  — see what's coming next (free)
-  — vote for a tool to be built (1 sat)

### Image Generation & Editing
-  — text-to-image (Grok Imagine, Seedream 4, Nano Banana 2)
-  — edit images with natural language instructions

### Image Processing
-  — BiRefNet SOTA, handles hair/glass/transparency (5 sats)
-  — 2x/4x Real-ESRGAN super-resolution (5 sats)
-  — CodeFormer NeurIPS 2022 face restoration (5 sats)
-  — safe/suggestive/explicit classification (2 sats)
-  — bounding boxes + confidence scores via Grounding DINO (5 sats)
-  — describe what to remove, no mask needed (15 sats)
-  — black-and-white photo colorization via DDColor (5 sats)
-  — NAFNet ECCV 2022 blur/noise removal (20 sats)

### Video & 3D
-  — text-to-video with Kling v3, async (per second)
-  — still image to video via Grok Imagine Video, async
-  — photo to textured GLB model via Seed3D, async

### Audio
-  — 467 voices, 45+ languages, emotion control, voice cloning
-  — clone any voice from a single audio sample
-  — Mistral Transcription with speaker diarization + timestamps
-  — AI vocals and instrumentation via Music-1.5

### Documents & Files
-  — PDF/image to Markdown via Mistral OCR
-  — structured data from receipts and invoices
-  — 200+ format conversions
-  — merge multiple PDFs preserving bookmarks
-  — HTML or Markdown to pixel-perfect PDF
-  — EPUB/PDF/TXT to M4B audiobook with chapters, async

### Text & Translation
-  — frontier LLMs (Kimi K2.5, GPT-OSS-120B, Qwen3-32B)
-  — image understanding via Qwen VL
-  — 119 languages via Qwen3-32B

### Communication
-  — send email to anyone, no SMTP setup
-  — send SMS to any phone number, no telecom account
-  — deliver a spoken message to any phone
-  — send an AI voice agent to handle a two-way phone conversation, returns transcript + analysis, async
-  — answer clarification questions before an AI call proceeds

### Async Job Lifecycle
Some tools (video, 3D, transcription, audiobook, AI calls) are async. They return a  immediately:
-  — poll until -  — retrieve the final output URL

### Support
-  — confirm a payment was received
-  — request refund for a failed service (free)

## Example Workflow: Remove background from an image

\
## Verification

- [ ]  returns the tool catalog without payment
- [ ]  returns a valid BOLT-11 Lightning invoice
- [ ] After paying,  returns - [ ] Tool call with the  returns the expected result

## Resources

- Docs: https://sats4ai.com/mcp
- Discovery manifest: https://sats4ai.com/.well-known/mcp
- Tool catalog with pricing: https://sats4ai.com/api/mcp/discovery
- npm: 