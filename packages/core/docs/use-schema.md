#### `useSchema`

This plugin is the simplest plugin for specifying your GraphQL schema. You can specify a schema created from any tool that emits `GraphQLSchema` object.

```ts
import { envelop, useSchema } from '@envelop/core'
import { parse, validate, execute, subscribe } from 'graphql'

const mySchema = buildSchema(/* ... */)

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    useSchema(mySchema)
    // ... other plugins ...
  ]
})
```
