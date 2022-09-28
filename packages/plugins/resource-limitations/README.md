## `@envelop/resource-limitations`

This plugins uses `extended-valiations` concept ([details here](https://github.com/n1ru4l/envelop/tree/main/packages/plugins/extended-validation#envelopextended-validation)) for implemeting a resource-limitations rate-limit similar to GitHub GraphQL API (see https://docs.github.com/en/graphql/overview/resource-limitations for more details)

## Getting Started

```
yarn add @envelop/resource-limitations
```

## Usage Example

```ts
import { parse, validate, execute, subscribe } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { useResourceLimitations } from '@envelop/resource-limitations'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, execute, subscribe }),
    // ... other plugins ...
    useResourceLimitations({
      nodeCostLimit: 500000, // optional, default to 500000
      paginationArgumentMaximum: 100, // optional, default to 100
      paginationArgumentMinimum: 1, // optional, default to 1
      paginationArgumentScalars: ['ConnectionInt'], // optional, use if connections use a different scalar type as the argument instead of `Int`
      extensions: false // set this to `true` in order to add the calculated const to the response of queries
    })
  ]
})
```
