---
'@envelop/response-cache': minor
---

Deprecate `ttlPerType` in favor of `ttlPerSchemaCoordinate`, for a more streamlined API

## Migration instructions

If you where using `ttlPerType`, you can merge the object into the `ttlPerSchemaCoordinate`, the
syntax doesn't change.

```diff
useResponseCache({
  session: null,
- ttlPerType: {
-   User: 10_000,
-   Profile: 600_000,
- },
  ttlPerSchemaCoordinate: {
    'Query.me': 0
+    User: 10_000,
+    Profile: 600_000,
  }
})
```
