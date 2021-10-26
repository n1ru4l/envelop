---
'@envelop/extended-validation': patch
'@envelop/operation-field-permissions': patch
---

Fix handling of introspection queries and disallow authorization bypassing. Previously, it was possible to bypass authorization by adding `\_\_schema` to query
