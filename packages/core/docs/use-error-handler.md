#### `useErrorHandler`

This plugin triggers a custom function when execution encounters an error.

```ts
import { envelop, useErrorHandler } from '@envelop/core'
import { parse, validate, execute, subscribe } from 'graphql'

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    useErrorHandler((errors, args) => {
      // This callback is called once, containing all GraphQLError emitted during execution phase
    })
    // ... other plugins ...
  ]
})
```
