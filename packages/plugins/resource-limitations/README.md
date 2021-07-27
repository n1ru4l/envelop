## `@envelop/resource-limitations`

This plugins uses `extended-valiations` concept ([details here](https://github.com/dotansimha/envelop/tree/main/packages/plugins/extended-validation#envelopextended-validation)) for implemeting a resource-limitations rate-limit similar to GitHub GraphQL API (see https://docs.github.com/en/graphql/overview/resource-limitations for more details)

## Getting Started

```
yarn add @envelop/resource-limitations
```

## Usage Example

```ts
import { envelop } from '@envelop/core';
import { useResourceLimitations } from '@envelop/resource-limitations';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResourceLimitations({
      nodeCostLimit: 500000, // optional, default to 500000
      extensions: false, // set this to `true` in order to add the calculated const to the response of queries
    }),
  ],
});
```
