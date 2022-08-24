#### `useExtendContext`

Easily extends the context with custom fields.

```ts
import { envelop, useExtendContext } from '@envelop/core'
import { parse, validate, execute, subscribe } from 'graphql'

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    useExtendContext(async contextSoFar => {
      return {
        myCustomField: {
          /* ... */
        }
      }
    })
    // ... other plugins ...
  ]
})
```
