---
'@envelop/graphql-executor': minor
---

[GraphQL Executor](https://github.com/yaacovCR/graphql-executor) Plugin

```
yarn add @envelop/graphql-executor
```

Then, use the plugin with your validation rules:

```ts
import { useGraphQLExecutor } from '@envelop/extended-validation'

const getEnveloped = envelop({
  plugins: [useGraphQLExecutor()]
})
```
