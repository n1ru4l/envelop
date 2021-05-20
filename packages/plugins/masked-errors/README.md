## `@envelop/masked-errors`

Prevent unexpected error messages from leaking to the GraphQL clients.

## Getting Started

```bash
yarn add @envelop/masked-errors
```

```ts
import { envelop, useSchema } from '@envelop/core';
import { useMaskedErrors, EnvelopError } from '@envelop/masked-errors';
import { makeExecutableSchema } from 'graphql';

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      something: String!
      somethingElse: String!
      somethingSpecial: String!
    }
  `,
  resolvers: {
    Query: {
      something: () => {
        throw new EnvelopError('Error that is propagated to the clients.');
      },
      somethingElse: () => {
        throw new Error("Unsafe error that will be masked as 'Unexpected Error.'.");
      },
      somethingSpecial: () => {
        throw new EnvelopError('The error will have an extensions field.', {
          code: 'ERR_CODE',
          randomNumber: 123,
        });
      },
    },
  },
});

const getEnveloped = envelop({
  plugins: [useSchema(schema), useMaskedErrors()],
});
```
