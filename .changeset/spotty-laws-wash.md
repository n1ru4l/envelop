---
'@envelop/core': patch
---

Prefer `globalThis.performance.now` for tracing if available. Fallback to `Date.now`.

Using tracing now no longer raises a errors on browser, deno and cloudflare workers.
