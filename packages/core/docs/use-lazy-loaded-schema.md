#### `useLazyLoadedSchema`

This plugin is the simplest plugin for specifying your GraphQL schema. You can specify a schema created from any tool that emits `GraphQLSchema` object, and you can choose to load the schema based on the initial context (or the incoming request).

```ts
import { envelop, useLazyLoadedSchema } from '@envelop/core'
import { parse, validate, execute, subscribe } from 'graphql'

async function getSchema({ req }): GraphQLSchema {
  if (req.isAdmin) {
    return adminSchema
  }

  return userSchema
}

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    useLazyLoadedSchema(getSchema)
    // ... other plugins ...
  ]
})
```
