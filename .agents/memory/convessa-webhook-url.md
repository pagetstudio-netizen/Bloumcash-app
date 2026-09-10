---
name: WhatsApp provider webhook
description: Compatibility rule for the existing WhatsApp callback endpoint during provider changes.
---

The existing WhatsApp callback must remain exactly `/api/webhooks/convessa` without a query token or custom header, even when the provider changes, so the deployed callback URL does not need to be changed.

**Why:** Keeping the callback path avoids a second Plesk/webhook migration. WAWP delivers events by POST, while a browser-facing GET request is not a webhook delivery method.

**How to apply:** Keep the POST handler available at the exact URL and parse the active provider's event envelope. Return JSON 404 for GET requests and unknown `/api` routes so they never fall through to the frontend SPA. Add provider-supported signing only when the active provider supports it.