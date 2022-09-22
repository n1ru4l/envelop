---
'@envelop/core': minor
---

A new plugin that can be used to customize the GraphQL Engine.

```ts
import { envelop, useEngine } from '@envelop/core'
import { parse, validate, execute, subscribe } from 'graphql'
import { parser } from 'my-custom-graphql-parser'

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    useEngine({
      //  Now your envelop will use the custom parser instead of the default one provided.
      parse: parser
    })
  ]
})
```
