---
'@envelop/response-cache': patch
---

Include operationName for building the cache key hash. Previously, sending the same operation document with a different operationName value could result in the wrong response being served from the cache.

Use `fast-json-stable-stringify` for stringifying the variableValues. This will ensure that the cache is hit more often as the variable value serialization is now more stable.
