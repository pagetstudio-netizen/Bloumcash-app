---
name: OneSignal auth header
description: Correct Authorization header format for OneSignal REST API v1
---

## Rule
OneSignal REST API v1 requires:
```
Authorization: Key <REST_API_KEY>
```
NOT `Basic <REST_API_KEY>`.

**Why:** Using `Basic` triggers a silent 401 Unauthorized from OneSignal — no error is surfaced to the app, notifications just never arrive. This was the root cause of push notifications not working despite ONESIGNAL_API_KEY being set.

**How to apply:** Any `fetch` to `https://onesignal.com/api/v1/...` must use `Authorization: Key ${ONESIGNAL_API_KEY}`. Affected files: `lib/onesignal.ts`, `routes/push-notification.ts`, `routes/test-push.ts`, `routes/push-diagnose.ts`.
