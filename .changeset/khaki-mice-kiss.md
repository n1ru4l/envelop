---
'@envelop/response-cache': patch
---

The plugin now try to reduce the size of the resulting query by not adding a `__typename` aliased
selection if `__typename` is already selected.
