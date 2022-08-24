## `@envelop/filter-operation-type`

This plugins injects a validation rule into the validation phase that only allows the specified operation types (e.g. `subscription`, `query` or `mutation`).

## Getting Started

```
yarn add @envelop/filter-operation-type
```

## Usage Example

```ts
import { parse, validate, execute, subscribe } from 'graphql'
import { envelop } from '@envelop/core'
import { useFilterAllowedOperations } from '@envelop/filter-operation-type'

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  // only allow execution of subscription operations
  plugins: [useFilterAllowedOperations(['subscription'])]
})
```
