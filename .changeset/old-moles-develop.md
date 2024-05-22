---
'@envelop/response-cache': patch
---

Fixes an issue where rejected promises returned from the cache were not being handled correctly,
causing an unhandled promise rejection which would terminate the process.
