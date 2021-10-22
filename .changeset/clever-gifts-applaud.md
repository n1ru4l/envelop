---
'@envelop/response-cache': minor
---

Introspection query operations are no longer cached by default.

In case you still want to cache query operations you can set the `ttlPerSchemaCoordinate` parameter to `{ "Query.__schema": undefined }` for caching introspection forever or `{ "Query.__schema": 100 }` for caching introspection for a specific time. We do not recommend caching introspection.

Query operation execution results that contain errors are no longer cached.
