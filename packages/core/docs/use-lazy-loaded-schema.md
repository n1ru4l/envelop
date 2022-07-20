#### `useLazyLoadedSchema`

This plugin is the simplest plugin for specifying your GraphQL schema. You can specify a schema created from any tool that emits `GraphQLSchema` object, and you can choose to load the schema based on the initial context (or the incoming request).

```ts
import { envelop, useLazyLoadedSchema } from '@envelop/core'
import { buildSchema } from '@envelop/graphql'

async function getSchema({ req }): GraphQLSchema {
  if (req.isAdmin) {
    return adminSchema
  }

  return userSchema
}

const getEnveloped = envelop({
  plugins: [
    useLazyLoadedSchema(getSchema)
    // ... other plugins ...
  ]
})
```
