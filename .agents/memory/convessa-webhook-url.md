---
name: Convessa webhook URL
description: Security and compatibility rule for the Convessa callback endpoint.
---

The Convessa callback must remain exactly `/api/webhooks/convessa` without a query token or custom header, because the provider configuration only accepts the webhook URL.

**Why:** Adding a secret parameter or requiring a custom header would prevent Convessa from delivering inbound messages. The browser-facing GET request is not the webhook delivery method.

**How to apply:** Keep the POST handler available at the exact URL. Return JSON 404 for GET requests and unknown `/api` routes so they never fall through to the frontend SPA. Use a provider-supported signature or header only if Convessa adds one later.