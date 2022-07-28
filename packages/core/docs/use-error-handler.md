#### `useErrorHandler`

This plugin triggers a custom function when execution encounters an error.

```ts
import { envelop, useErrorHandler } from '@envelop/core'
import { buildSchema } from '@graphql-tools/graphql'

const getEnveloped = envelop({
  plugins: [
    useErrorHandler((errors, args) => {
      // This callback is called once, containing all GraphQLError emitted during execution phase
    })
    // ... other plugins ...
  ]
})
```
