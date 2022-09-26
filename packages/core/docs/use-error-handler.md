#### `useErrorHandler`

This plugin triggers a custom function when execution encounters an error.

```ts
import { envelop, useEngine, useErrorHandler } from '@envelop/core'
import { parse, validate, execute, subscribe } from 'graphql'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, execute, subscribe }),
    useErrorHandler((errors, args) => {
      // This callback is called once, containing all GraphQLError emitted during execution phase
    })
    // ... other plugins ...
  ]
})
```
