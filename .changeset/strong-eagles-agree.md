---
'@envelop/response-cache': major
---

The `enable` parameter now allows to entirely disable caching. It is checked eagerly and disables
all cache related processing.

**Breaking Change:**

Previously, `enable` was only controlling cache reading. This means that previously, the automatic
cache invalidation was still working even with `enable` returning false, which is no longer the
case. The alternative is to cautiously invalidate data in the related resolvers.
