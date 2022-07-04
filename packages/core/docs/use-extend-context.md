#### `useExtendContext`

Easily extends the context with custom fields.

```ts
import { envelop, useExtendContext } from '@envelop/core'
import { buildSchema } from 'graphql'

const getEnveloped = envelop({
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
