#### `useExtendContext`

Easily extends the context with custom fields.

```ts
import { envelop, useEngine, useExtendContext } from '@envelop/core'
import { parse, validate, specifiedRules, execute, subscribe } from 'graphql'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
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
