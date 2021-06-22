## `@envelop/operation-field-permissions`

Disallow executing operations that select certain fields. Useful if you want to restrict the scope of certain public API users to a subset of the public GraphQL schema.

## Installation

```bash
yarn add @envelop/operation-field-permissions
```

## Usage Example

```ts
import { envelop, useSchema } from '@envelop/core';
import { useOperationFieldPermissions } from 'envelop/operation-field-permissions';

const getEnveloped = envelop({
  plugins: [
    useSchema(schema),
    useOperationFieldPermissions({
      // we can access graphql context here
      getPermissions: async context => new Set(['Query.greetings', ...context.viewer.permissions]),
    }),
    /* ... other envelops */
  ],
});
```

**Schema**

```graphql
type Query {
  greetings: [String!]!
  foo: String
}
```

**Operation**

```graphql
query {
  foo
}
```

**Response**

```json
{
  "data": null,
  "errors": [
    {
      "message": "Insufficient permissions for selecting 'Query.foo'.",
      "locations": [
        {
          "line": 2,
          "column": 2
        }
      ]
    }
  ]
}
```
