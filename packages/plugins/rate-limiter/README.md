## `@envelop/rate-limiter`

This plugins uses [`graphql-rate-limit`](https://github.com/teamplanes/graphql-rate-limit#readme) in order to limit the rate of calling queries and mutations.

## Getting Started

```
yarn add @envelop/rate-limiter
```

## Usage Example

```ts
import { envelop } from '@envelop/core';
import { useRateLimiter, IdentifyFn } from '@envelop/generic-auth';

const identifyFn: IdentifyFn = async context => {
  return context.request.ip
};

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useRateLimiter({
      identifyFn
    }),
  ],
});
```

> By default, we assume that you have the GraphQL directive definition as part of your GraphQL schema (`directive @rateLimit(max: Int, window: String, message: String) on FIELD_DEFINITION`).

Then, in your GraphQL schema SDL, you can add `@rateLimit` directive to your fields, and the limiter will get called only while resolving that specific field:

```graphql
type Query {
  posts: [Post]! @rateLimit(
    window: "5s", // time interval window for request limit quota
    max: 10,  // maximum requests alowed in time window
    message: "Too many calls!"  // quota reached error message
  )
  # unlimitedField: String
}
```

> You can apply that directive to any GraphQL `field` definition, not only to root fields.

## Notes

You can find more details here: hhttps://github.com/teamplanes/graphql-rate-limit#readme
