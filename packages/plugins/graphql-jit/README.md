## `@envelop/graphql-jit`

This plugins replaces the original `execute` of GraphQL with [`graphql-jit`](https://github.com/zalando-incubator/graphql-jit).

## Getting Started

```
yarn add @envelop/graphql-jit
```

## Usage Example

```ts
import { envelop } from '@envelop/core';
import { useGraphQlJit } from '@envelop/graphql-jit';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useGraphQlJit(
      {
        // your compiler options here. See https://github.com/zalando-incubator/graphql-jit#compiledquery--compilequeryschema-document-operationname-compileroptions
      },
      {
        onError: (e: Error) => { ... } // custom error handler
      }
    ),
  ],
});
```

## Conditional Execution

If you wish to conditionally use the JIT executor based on the incoming request, you can use `enableIf` config flag and return a `boolean` based on the `ExecutionArgs`:

```ts
import { envelop } from '@envelop/core';
import { useGraphQlJit } from '@envelop/graphql-jit';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useGraphQlJit(
      {
        // your compiler options here. See https://github.com/zalando-incubator/graphql-jit#compiledquery--compilequeryschema-document-operationname-compileroptions
      },
      {
        enableIf: executionArgs => executionArgs.contextValue.shouldUseJit,
      }
    ),
  ],
});
```

## Configuring JIT cache

You can configure the JIT cache with the following options:

```ts
import { envelop } from '@envelop/core';
import { useGraphQlJit } from '@envelop/graphql-jit';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useGraphQlJit(
      {
        // your compiler options here
      },
      {
        max: 1000, // Number of items to keep in cache (defaults to 1000)
        ttl: 3600000, // Time to live for items in cache (defaults to 3600000 - one hour)
        cache: lru(), // Pass in a custom cache instance, by default a new LRU cache is created which uses the default `max` and `ttl` settings
      }
    ),
  ],
});
```

## Notes

You can find more details here: https://github.com/zalando-incubator/graphql-jit
