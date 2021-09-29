## `@envelop/validation-cache`

This plugins adds simple LRU caching to your `validate`, to improve performance by caching the validation result.

This plugins improves performance of validating by ~50% (based on benchmarks).

## Getting Started

```
yarn add @envelop/validation-cache
```

## Usage Example

```ts
import { envelop } from '@envelop/core';
import { useValidationCache } from '@envelop/validation-cache';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useValidationCache({
      // options goes here
    }),
  ],
});
```

### API Reference

#### `max`

Set this to configure your maximum amount of items in the LRU cache. The default is `1000`.

#### `ttl`

Set this to configure the TTL (time to live) of items in the LRU cache. The default is `3600000`.

#### `cache`

Set this to pass in a cache instance. By default a new LRU cache is created using `max` and `ttl`.
