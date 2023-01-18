---
"@envelop/sentry": patch
---

Adds the root sentry span to a resolver's context - so you can safely grab it from your own code without relying on singletons.
