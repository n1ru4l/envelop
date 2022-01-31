---
'@envelop/core': minor
'@envelop/types': minor
---

Add new option `breakContextBuilding` to `OnContextBuildingEventPayload`.

This allows short-circuiting the context building phase. Please use this with care as careless usage of it can result in severe errors during the execution phase, as the context might not include all the fields your schema resolvers need.
