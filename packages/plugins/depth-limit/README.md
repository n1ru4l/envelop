## `@envelop/depth-limit`

This plugins uses [`graphql-depth-limit`](https://www.npmjs.com/package/graphql-depth-limit) in order to limit the depth of executed selection sets (by injecting a new GraphQL validation rule into your execution).

## Getting Started

```
yarn add @envelop/depth-limit
```

## Usage Example

```ts
import { parse, validate, execute, subscribe } from 'graphql'
import { envelop } from '@envelop/core'
import { useDepthLimit } from '@envelop/depth-limit'

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    // ... other plugins ...
    useDepthLimit({
      maxDepth: 10
      // ignore: [ ... ] - you can set this to ignore specific fields or types
    })
  ]
})
```

## Notes

You can find more details here: https://www.npmjs.com/package/graphql-depth-limit#documentation
