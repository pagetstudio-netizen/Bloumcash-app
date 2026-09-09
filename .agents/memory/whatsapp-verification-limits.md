---
name: WhatsApp verification limits
description: Durable design rule for limiting WhatsApp verification requests and code attempts.
---

The WhatsApp verification request window and failed-attempt counter must live in PostgreSQL and be updated atomically, rather than in process memory.

**Why:** API instances can restart or scale independently; in-memory counters would reset on restart and allow users to bypass the intended limits by reaching another instance.

**How to apply:** Keep the request-window increment, attempt increment, and resets as database updates keyed by the WhatsApp conversation. Preserve the limits and expiry behavior when changing the onboarding flow.