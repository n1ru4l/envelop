---
'@envelop/core': major
---

Removed orchestrator tracing

`GraphQLSchema` was wrapped to provide resolvers/fields tracing from the schema. Issue with this approach was it was very specific to the underlying engine's implementation. With the new version we no longer want to depend to a specific implementation. Now users can wrap their schemas and add tracing themselves.
