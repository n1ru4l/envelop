## `@envelop/response-cache-upstash`

- Supports redis cache for `@envelop/response-cache` plugin
- Optimized for serveless deployments where stateless HTTP connections are preferred over TCP.

[Check out the GraphQL Response Cache Guide for more information](https://envelop.dev/docs/guides/adding-a-graphql-response-cache)

## Getting Started

```bash
yarn add @envelop/response-cache
yarn add @envelop/response-cache-upstash
```

If you are using a raw nodejs environment prior v18, you need to add a fetch polyfill like `isomorphic-fetch`

```bash
yarn add isomorphic-fetch
```

And import it

```ts
import 'isomorphic-fetch';
```

Platforms like Vercel, Cloudflare and Fastly already provide this and you don't need to do anything.

## Usage Example

This plugin uses Upstash serverless Redis, so you do not have to manage any redis instance yourself and the pricing scales to zero.

- Create a Redis database over at [Upstash](https://console.upstash.com/)
- Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from the bottom of the page.
- Create an instance of Upstash Redis
- Create an instance of the Redis Cache and set to the `useResponseCache` plugin options

```ts
import { envelop } from '@envelop/core';
import { useResponseCache } from '@envelop/response-cache';
import { createUpstashCache } from '@envelop/response-cache-upstash";

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: 'UPSTASH_REDIS_REST_URL',
  token: 'UPSTASH_REDIS_REST_TOKEN',
});

// or you can set the url and token as environment variable and create redis like this:
const redis = Redis.fromEnv();

const cache = createUpstashCache({ redis });

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResponseCache({ cache }),
  ],
});
```

### Invalidate Cache based on custom logic

```ts
import { envelop } from '@envelop/core';
import { useResponseCache } from '@envelop/response-cache';
import { createUpstashCache } from '@envelop/response-cache-upstash';

import { emitter } from './eventEmitter';

// we create our cache instance, which allows calling all methods on it
const redis = Redis.fromEnv();

const cache = createUpstashCache({ redis });

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttl: 2000,
      // we pass the cache instance to the request.
      cache,
    }),
  ],
});

emitter.on('invalidate', resource => {
  cache.invalidate([
    {
      typename: resource.type,
      id: resource.id,
    },
  ]);
});
```
