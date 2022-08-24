## `@envelop/fragment-arguments`

This plugins replaces the default GraphQL `parser` with an extended version that supports setting arguments on fragments.

For reference, see: https://github.com/graphql/graphql-js/pull/3152

PLEASE DON'T USE THIS IN PRODUCTION!

## Getting Started

```
yarn add @envelop/fragment-arguments
```

## Usage Example

```ts
import { parse, validate, execute, subscribe } from 'graphql'
import { envelop } from '@envelop/core'
import { useFragmentArguments } from '@envelop/fragment-arguments'

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    // ... other plugins ...
    useFragmentArguments()
  ]
})
```
