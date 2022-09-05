---
'@envelop/core': major
---

Remove async schema loading plugin. This was a mistake from beginning as we cannot asynchronously `validate` and `parse` since with GraphQL.js are synchronous in nature.
