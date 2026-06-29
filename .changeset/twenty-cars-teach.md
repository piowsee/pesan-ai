---
'pesan-ai': minor
---

update `botResponse` field on bot webhook response to optional and when `botResponse` is null and `adminTakeover` is true, skip bot reply but still trigger SSE conversation update event to notify changes to client.
