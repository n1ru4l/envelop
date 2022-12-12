#### `useEngine`

This plugin can be used to customize the GraphQL Engine.

```ts
import { envelop, useEngine } from '@envelop/core'
import { parse, validate, specifiedRules, execute, subscribe } from 'graphql'

const getEnveloped = envelop({
  plugins: [
    useEngine({
      parse,
      validate,
      specifiedRules,
      execute,
      subscribe
    })
  ]
})
```
