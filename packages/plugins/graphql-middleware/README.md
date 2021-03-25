## `@envelop/graphql-middleware`

This plugins wraps [`graphql-middleware`](https://github.com/maticzav/graphql-middleware) and allow you to apply schema middlewares that uses the standard defined by `graphql-middleware`.

> You can find an awesome [list of middlewares here](https://github.com/maticzav/graphql-middleware#awesome-middlewares-)

## Getting Started

```
yarn add graphql-middleware @envelop/graphql-middleware
```

## Usage Example

You can use any type of middleware defined for `graphql-middleware`, here's an example for doing that with [`graphql-shield`](https://github.com/maticzav/graphql-shield):

```ts
import { envelop } from '@envelop/core';
import { useGraphQLMiddleware } from '@envelop/graphql-middleware';
import { rule, shield, and, or, not } from 'graphql-shield';

// ...
// You can find a complete example here: https://github.com/maticzav/graphql-shield#graphql-yoga
// ...

const permissions = shield({
  Query: {
    fruits: and(isAuthenticated, or(isAdmin, isEditor)),
  },
  Mutation: {
    addFruitToBasket: isAuthenticated,
  },
  Fruit: isAuthenticated,
  Customer: isAdmin,
});

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useSchema(mySchema),
    useGraphQLMiddleware([permissions]),
  ],
});
```
