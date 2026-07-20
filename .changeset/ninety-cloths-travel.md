---
'pesan-ai': minor
---

This commit introduces rich text formatting for WhatsApp messages and supports multi-file media uploads with individual captions, alongside UI improvements for media chat bubbles and conversation lists. It significantly optimizes chat performance by introducing expiration-based caching for media download URLs and ensuring real-time SSE cache invalidation only triggers on lost connections to prevent redundant network requests. Additionally, core messaging stability is improved by enforcing strict chronological message queueing, automatically routing default typing to the composer, fixing missing document filenames, capping messages to the 4096-character WhatsApp limit, and resolving underlying security and test coverage issues.
