---
'@envelop/core': major
---

Remove `useAsyncSchema` plugin

This was a mistake from beginning as we cannot asynchronously validate and parse since with [graphql](https://github.com/graphql/graphql-js) these functions are synchronous in nature.
