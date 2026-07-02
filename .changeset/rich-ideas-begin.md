---
'pesan-ai': patch
---

Fixed the redirect message debouncer to fall back to admin takeover when the debounced message history contains non-text messages. This prevents non-text-only or unsupported histories from producing empty/invalid bot webhook payloads while preserving `type` as an internal routing signal.

Enforced scoped ownership checks across admin takeover and bot redirect flows by requiring user and WABA context when loading conversations. Incoming and echo message processing now resolves phone number ownership up front so downstream debounce, realtime, and redirect logic receive guaranteed `userId` and `wabaId`.
