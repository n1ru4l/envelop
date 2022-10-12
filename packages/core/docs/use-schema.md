#### `useSchema`

This plugin is the simplest plugin for specifying your GraphQL schema. You can specify a schema created from any tool that emits `GraphQLSchema` object.

```ts
import { envelop, useSchema, useEngine } from '@envelop/core'
import { parse, validate, execute, subscribe } from 'graphql'

const mySchema = buildSchema(/* ... */)

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, execute, subscribe }),
    useSchema(mySchema)
    // ... other plugins ...
  ]
})
```
