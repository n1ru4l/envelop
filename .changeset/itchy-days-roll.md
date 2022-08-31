---
'@envelop/core': minor
'@envelop/apollo-datasources': minor
'@envelop/apollo-federation': minor
'@envelop/apollo-server-errors': minor
'@envelop/apollo-tracing': minor
'@envelop/auth0': minor
'@envelop/dataloader': minor
'@envelop/depth-limit': minor
'@envelop/disable-introspection': minor
'@envelop/execute-subscription-event': minor
'@envelop/extended-validation': minor
'@envelop/filter-operation-type': minor
'@envelop/fragment-arguments': minor
'@envelop/generic-auth': minor
'@envelop/graphql-jit': minor
'@envelop/graphql-middleware': minor
'@envelop/graphql-modules': minor
'@envelop/live-query': minor
'@envelop/newrelic': minor
'@envelop/opentelemetry': minor
'@envelop/operation-field-permissions': minor
'@envelop/parser-cache': minor
'@envelop/persisted-operations': minor
'@envelop/preload-assets': minor
'@envelop/prometheus': minor
'@envelop/rate-limiter': minor
'@envelop/resource-limitations': minor
'@envelop/response-cache': minor
'@envelop/response-cache-redis': minor
'@envelop/sentry': minor
'@envelop/statsd': minor
'@envelop/validation-cache': minor
'@envelop/testing': minor
'@envelop/types': minor
---

Adding tslib to package dependencies

Projects that currently are using yarn Berry with PnP or any strict dependency
resolver, that requires that all dependencies are specified on
package.json otherwise it would endue in an error if not treated correct

Since https://www.typescriptlang.org/tsconfig#importHelpers is currently
being used, tslib should be exported as a dependency to external runners
get the proper import.

Change on each package:

```json
// package.json
{
  "dependencies": {
    "tslib": "^2.4.0"
  }
}
```
