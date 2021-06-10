## `@envelop/live-query`

The easiest way of adding live queries to your GraphQL server!

```bash
yarn add @envelop/live-query @n1ru4l/in-memory-live-query-store
```

## Usage Example

```ts
import { envelop, useSchema, useExtendContext } from '@envelop/core';
import { createApplication } from 'graphql-modules';
import { useLiveQuery } from '@envelop/live-query';
import { InMemoryLiveQueryStore } from '@n1ru4l/in-memory-live-query-store';
import { makeExecutableSchema } from '@graphql-tools/schema';

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      greetings: [String!]
    }
  `,
  resolvers: {
    Query: {
      greetings: (_, __, context) => context.greetings,
    },
  },
});

const liveQueryStore = new InMemoryLiveQueryStore();

const greetings = ['Hello', 'Hi', 'Ay', 'Sup'];
// Shuffle greetings and invalidate queries selecting Query.greetings every second.
setInterval(() => {
  const firstElement = greetings.pop();
  greetings.unshift(firstElement);
  liveQueryStore.invalidate('Query.greetings');
}, 1000);

const getEnveloped = envelop({
  plugins: [
    useSchema(schema),
    useLiveQuery({ liveQueryStore }),
    useExtendContext(() => ({ greetings })),
    /* other plugins */
  ],
});
```

For more detail check out https://github.com/n1ru4l/graphql-live-query
