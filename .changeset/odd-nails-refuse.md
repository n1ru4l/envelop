---
'@envelop/response-cache': patch
---

Fix TTL being NaN when using `@cacheControl` without `maxAge` argument.
