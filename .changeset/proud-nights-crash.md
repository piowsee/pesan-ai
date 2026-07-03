---
'pesan-ai': patch
---

Increase chat workspace responsiveness by updating params locally instead of waiting for url replacement, refactor chat components by grouping it based on panel, and use dynamic route for wabaId and convId instead of query param (chatWorkspace component is used on layout to avoid remount)
