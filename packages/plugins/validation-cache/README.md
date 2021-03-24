## `@envelop/validation-cache`

This plugins adds simple LRU caching to your `validate`, to execurion improve performance by caching the validation result.

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
