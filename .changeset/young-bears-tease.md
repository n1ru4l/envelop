---
'@envelop/response-cache-cloudflare-kv': minor
---

BREAKING: Now the cache implementation does not require the `ExecutionContext` but the `waitUntil`
method from it;

```ts
import { createSchema, createYoga, YogaInitialContext } from 'graphql-yoga'
import { useResponseCache } from '@envelop/response-cache'
import { createKvCache } from '@envelop/response-cache-cloudflare-kv'
import { resolvers } from './graphql-schema/resolvers.generated'
import { typeDefs } from './graphql-schema/typeDefs.generated'

export type Env = {
  GRAPHQL_RESPONSE_CACHE: KVNamespace
}

const graphqlServer = createYoga<Env & ExecutionContext>({
  schema: createSchema({ typeDefs, resolvers }),
  plugins: [
    useResponseCache({
      cache: ctx =>
        createKvCache({
          KV: ctx.GRAPHQL_RESPONSE_CACHE,
          waitUntil: ctx.waitUntil,
          keyPrefix: 'graphql' // optional
        }),
      session: () => null,
      includeExtensionMetadata: true,
      ttl: 1000 * 10 // 10 seconds
    })
  ]
})

export default {
  fetch: graphqlServer
}
```
