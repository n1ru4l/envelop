---
'@envelop/sentry': major
---

Remove `trackResolvers` functionality.

This feature resulted in errors being reported multiple times.
In the future we might re-add it as a standalone plugin, right now we don't see any benefit from it.
