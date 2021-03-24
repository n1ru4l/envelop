## `@envelop/dataloader`

This plugin helps you to create a new [DataLoader](https://github.com/graphql/dataloader) instance every time your context is being built. The created instane is injected into the `context` with the name your wish to use.

## Getting Started

```
yarn add dataloader @envelop/dataloader
```

## Usage Example

```ts
import { envelop } from '@envelop/core';
import DataLoader from 'dataloader';
import { useDataLoader } from '@envelop/dataloader';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useDataLoader({
      name: 'users',
      builderFn: context => new DataLoader(keys => myBatchGetUsers(keys)),
    }),
  ],
});
```

Then, when you need to use it in your resolvers, just take it from the context:

```ts
export const resolvers = {
  Query: {
    user: (root, args, context, info) => {
      return context.users.load(args.id);
    },
  },
};
```

## Notes

There are several ways to create and use DataLoader, please refer to: https://github.com/graphql/dataloader#caching-per-request for more details.
