---
'@envelop/sentry': minor
---

New feature: `traceparentData` (default: `{}`) - Adds tracing data to be sent to Sentry - this includes traceId, parentId and more. This can be used in connection with headers from the request to add the tracing details for Sentry.
