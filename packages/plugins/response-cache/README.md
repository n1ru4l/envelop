## `@envelop/response-cache`

- Skip the execution phase and reduce server load by caching execution results in-memory.
- Customize cache entry time to live based on fields and types within the execution result.
- Automatically invalidate the cache based on mutation selection sets.
- Customize invalidation through the cache api (e.g. listen to a database write log).
- Implement your own global cache (e.g. using another key/value store) by implementing the `Cache` interface.

[Check out the GraphQL Response Cache Guide for more information](https://envelop.dev/docs/guides/adding-a-graphql-response-cache)

## Getting Started

```bash
yarn add @envelop/response-cache
```

## Usage Example

When configuring the `useResponseCache`, you can choose the type of cache:

- In-Memory LRU Cache (default)
- Redis Cache (see: `@envelop/response-cache-redis`)

### In-Memory Cache

The in-memory LRU cache is used by default.

```ts
import { envelop } from '@envelop/core';
import { useResponseCache } from '@envelop/response-cache';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResponseCache(),
  ],
});
```

Or, you may create the in-memory LRU cache explicitly.

```ts
import { envelop } from '@envelop/core';
import { useResponseCache, createInMemoryCache } from '@envelop/response-cache';

const cache = createInMemoryCache();

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResponseCache({ cache }),
  ],
});
```

> Note: The in-memory LRU cache is not suitable for serverless deployments. Instead, consider the Redis cache provided by `@envelop/response-cache-redis`.

### Redis Cache

```bash
yarn add @envelop/response-cache-redis
```

In order to use the Redis cache, you need to:

- Create a Redis database
- Collect the connection settings (or its connection string), e.g., `host`, `port`, `username`, `password`, `tls`, etc.
- Create and configure a [Redis client](https://github.com/luin/ioredis) with your [connection settings](https://github.com/luin/ioredis/blob/master/API.md#Redis) and any [additional options](https://github.com/luin/ioredis/blob/master/API.md#new_Redis_new)
- Create an instance of the Redis Cache and set to the `useResponseCache` plugin options

```ts
import { envelop } from '@envelop/core';
import { useResponseCache } from '@envelop/response-cache';
import { createRedisCache } from '@envelop/response-cache-redis';

import Redis from 'ioredis';

const redis = new Redis({
  host: 'my-redis-db.example.com',
  port: '30652',
  password: '1234567890',
});

const redis = new Redis(("rediss://:1234567890@my-redis-db.example.com':30652");

const cache = createRedisCache({ redis });

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResponseCache({ cache }),
  ],
});
```

> Note: In the Recipes below, be sure to provide your Redis `cache` instance with `useResponseCache({ cache })`.

## Recipes

### Cache with maximum TTL

```ts
import { envelop } from '@envelop/core';
import { useResponseCache } from '@envelop/response-cache';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttl: 2000, // cached execution results become stale after 2 seconds
    }),
  ],
});
```

> Note: Setting `ttl: 0` will disable TTL for all types. You can use that if you wish to disable caching for all type, and then enable caching for specific types using `ttlPerType`.

### Cache with custom TTL per object type

```ts
import { envelop } from '@envelop/core';
import { useResponseCache } from '@envelop/response-cache';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttl: 2000,
      ttlPerType: {
        // cached execution results that contain a `Stock` object become stale after 500ms
        Stock: 500,
      },
    }),
  ],
});
```

### Cache with custom TTL per schema coordinate

```ts
import { envelop } from '@envelop/core';
import { useResponseCache } from '@envelop/response-cache';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttl: 2000,
      ttlPerSchemaCoordinate: {
        // cached execution results that select the `Query.user` field become stale after 100ms
        'Query.rocketCoordinates': 100,
      },
    }),
  ],
});
```

### Cache based on session/user

```ts
import { envelop } from '@envelop/core';
import { useResponseCache } from '@envelop/response-cache';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttl: 2000,
      // context is the GraphQL context used for execution
      session: context => String(context.user?.id),
    }),
  ],
});
```

### Disable cache based on session/user

```ts
import { envelop } from '@envelop/core';
import { useResponseCache } from '@envelop/response-cache';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttl: 2000,
      // context is the GraphQL context used for execution
      enabled: context => context.user?.role !== 'admin',
    }),
  ],
});
```

### Customize if result should be cached

You can define s custom function used to check if the result should be cached.

This is useful for advanced use-cases. E.g. if you want to
cache Introspection queries or choose if results with certain error types
should be cached.

By default it used the `defaultShouldCacheResult` function:

- Introspection queries are not cached.
- Neither are any results with errors (unexpected, EnvelopError or GraphQLError) or
- Results will missing data

The `ShouldCacheResultFunction` can access the `DocumentNode` during the Parse phase and
the `ExecutionResult` before or after the Execution phase.

```ts
import { envelop } from '@envelop/core';
import { useResponseCache } from '@envelop/response-cache';

const myCustomShouldCacheResult: ShouldCacheResultFunction = (params: {
  cacheIntrospections?: Boolean;
  documentNode?: DocumentNode;
  result?: ExecutionResult;
}): Boolean => {
  return true; // if the ExecutionResult should be cached
};

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResponseCache({
      shouldCacheResult = myCustomShouldCacheResult,
    }),
  ],
});
```

### Prevent caching of Introspection queries

By default, Introspection queries are not cached which is helpful when testing the cache behavior in development while the schema may be non yet finalized.

```ts
import { envelop } from '@envelop/core';
import { useResponseCache } from '@envelop/response-cache';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResponseCache({
      cacheIntrospections: false, // this is default behavior
    }),
  ],
});
```

> Note: The `cacheIntrospections` is used by the `shouldCacheResult` function, so if you customize that behavior, you will need to handle the Introspection query caching logic.

### Cache Introspection queries

When in production and the schema is unlikely to change, then you my want to cache Inspection Queries.

Note that if subsequent schema changes happen, you will need to invalidate or flush the cache to refresh the schema.

```ts
import { envelop } from '@envelop/core';
import { useResponseCache } from '@envelop/response-cache';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResponseCache({
      cacheIntrospections: true,
    }),
  ],
});
```

> Note: The `cacheIntrospections` is used by the `shouldCacheResult` function, so if you customize that behavior, you will need to handle the Introspection query caching logic.

### Cache with maximum TTL

```ts
import { envelop } from '@envelop/core';
import { useResponseCache } from '@envelop/response-cache';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttl: 2000, // cached execution results become stale after 2 seconds
    }),
  ],
});
```

### Customize the fields that are used for building the cache ID

```ts
import { envelop } from '@envelop/core';
import { useResponseCache } from '@envelop/response-cache';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttl: 2000,
      // use the `_id` instead of `id` field.
      idFields: ['_id'],
    }),
  ],
});
```

### Disable automatic cache invalidation via mutations

```ts
import { envelop } from '@envelop/core';
import { useResponseCache } from '@envelop/response-cache';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttl: 2000,
      // some might prefer invalidating based on a database write log
      invalidateViaMutation: false,
    }),
  ],
});
```

### Invalidate Cache based on custom logic

```ts
import { envelop } from '@envelop/core';
import { useResponseCache, createInMemoryCache } from '@envelop/response-cache';
import { emitter } from './eventEmitter';

// we create our cache instance, which allows calling all methods on it
const cache = createInMemoryCache();

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

### Customize how cache ids are built

```ts
import { envelop } from '@envelop/core';
import { useResponseCache, createInMemoryCache } from '@envelop/response-cache';
import { emitter } from './eventEmitter';

// we create our cache instance, which allows calling all methods on it
const cache = createInMemoryCache({
  // in relay we have global unique ids, no need to use `typename:id`
  makeId: (typename, id) => id ?? typename,
});

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
```

### Expose cache metadata via extensions

For debugging or monitoring it might be useful to know whether a response got served from the cache or not.

```ts
const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttl: 2000,
      includeExtensionMetadata: true,
    }),
  ],
});
```

This option will attach the following fields to the execution result if set to true (or `process.env["NODE_ENV"]` is `"development"`).

- `extension.responseCache.hit` - Whether the result was served form the cache or not
- `extension.responseCache.invalidatedEntities` - Entities that got invalidated by a mutation operation

#### Examples:

**Cache miss (response is generated by executing the query):**

```graphql
query UserById {
  user(id: "1") {
    id
    name
  }
}
```

```json
{
  "result": {
    "user": {
      "id": "1",
      "name": "Laurin"
    }
  },
  "extensions": {
    "responseCache": {
      "hit": false
    }
  }
}
```

**Cache hit (response served from response cache):**

```graphql
query UserById {
  user(id: "1") {
    id
    name
  }
}
```

```json
{
  "result": {
    "user": {
      "id": "1",
      "name": "Laurin"
    }
  },
  "extensions": {
    "responseCache": {
      "hit": true
    }
  }
}
```

**Invalidation via Mutation:**

```graphql
mutation SetNameMutation {
  userSetName(name: "NotLaurin") {
    user {
      id
      name
    }
  }
}
```

```json
{
  "result": {
    "userSetName": {
      "user": {
        "id": "1",
        "name": "Laurin"
      }
    }
  },
  "extensions": {
    "invalidatedEntities": [{ "id": "1", "typename": "User" }]
  }
}
```
