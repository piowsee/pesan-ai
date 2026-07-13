---
'pesan-ai': patch
---

Change message fetch limit from a fixed 50 to the greater of the conversation's unread count, so all unread messages are retrieved while keeping default to 50.
