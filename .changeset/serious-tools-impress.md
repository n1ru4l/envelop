---
'@envelop/persisted-operations': major
---

BREAKING CHANGE: The operation ID written to the context is now a Symbol (instead of a string), use `readOperationId` to get it within your code / other plugins
