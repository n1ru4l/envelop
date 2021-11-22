---
'@envelop/sentry': minor
---

Adds a new `skipError` option, which allows users to skip certain errors.

It's useful in the case where a user has defined custom error types, such as `ValidationError` which may be used to validate resolver arguments.
