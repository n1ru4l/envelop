## `@envelop/pruned-schema`

This plugins clean up the registered schema by removing unused and empty types.

## Getting Started

```bash
yarn add @envelop/pruned-schema
```

## Usage Example

See
[@graphql-tools/utils/pruneSchema](https://the-guild.dev/graphql/tools/docs/api/interfaces/utils_src.PruneSchemaOptions)
for the list of available options.

```ts
import { execute, parse, subscribe, validate } from 'graphql'
import { envelop } from '@envelop/core'
import { usePrunedSchema } from '@envelop/response-cache'

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    // ... other plugins ...
    usePrunedSchema({
      // pruneSchema options
    })
  ]
})
```
