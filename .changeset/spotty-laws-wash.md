---
'@envelop/core': patch
---

Prefer `globalThis.performance.now` for tracing if available. Fallback to `Date.now`.

Using tracing no longer raises an error on browser, deno and cloudflare worker environments.
