---
'@envelop/response-cache-redis': patch
---

Delete keys only if there are keys since calling del on empty causes errors and server to halt. See https://github.com/dotansimha/envelop/issues/1090
