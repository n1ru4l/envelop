## `@envelop/parser-cache`

This plugins adds simple LRU caching to your `parse`, to improve performance by caching the parsed result.

This plugins improves performance of parsing by ~60% (based on benchmarks).

## Getting Started

```
yarn add @envelop/parser-cache
```

## Usage Example

```ts
import { envelop } from '@envelop/core';
import { useParserCache } from '@envelop/parser-cache';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useParserCache({
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
