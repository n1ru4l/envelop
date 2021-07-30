---
title: Adding a GraphQL Response Cache
sidebar_label: Adding a GraphQL Response Cache
---

# Adding a GraphQL Response Cache

## A brief Introduction to Caching

Huge requests can slow down your server as a lot of subsequent database reads or other remote services must be performed. Tools like `DataLoader` can reduce the amount of concurrent and subsequent requests, but a remote service that takes a lot of time to respond and which we cannot modify as we don't own it might be slow every time we call it.

A common practice for reducing slow requests is to leverage caching. There are many types of caching available. E.g. We could cache the whole HTTP responses based on the POST body using or an in memory cache within our GraphQL resolver business logic in order to hit slow services less frequently.

Having a cache comes with the drawback of requiring some kind of cache invalidation mechanism in case the underlying entities have changed. Expiring the cache via a TTL (time to live) is a widespread practice, but can result in hitting the cache too often or too scarcely. Another popular strategy is to incorporate cache invalidation logic into the business logic. Writing such logic can potentially become too verbose and hard to maintain. Other systems might use database write log observers for invalidating resources based on updated database rows.

In a strict REST API environment, caching entities is significantly easier, as each endpoint represents one resource, and thus a `GET` method can be cached and a `PATCH` method can be used for automatically invalidating the resource which is described via the HTTP path (`/api/user/12`).

With GraphQL such things become much harder. A query operation execution result could contain many different types of entities, thus, we need different strategies for caching GraphQL APIs.

SAAS services like FastQL and GraphCDN started popping up that use mechanisms for caching GraphQL execution results. But how does this even work?

## How does Response Caching work?

### Caching Query Operations

In order to cache a GraphQL execution result (response) we need to build an identifier based on the input that can be used to identify whether a response can be served from the cache or must be executed and then stored within the cache.

**Example: GraphQL Query Operation**

```graphql
query UserProfileQuery($id: ID!) {
  user(id: $id) {
    __typename
    id
    login
    repositories
    friends(first: 2) {
      __typename
      id
      login
    }
  }
}
```

**Example: GraphQL Variables**

```json
{
  "id": "1"
}
```

Usually those inputs are the Query operation document and the variables for such an operation document.

Thus a response cache can store the execution result under a cache key that is built from those inputs:

```
OperationCacheKey (e.g. SHA1) = hash(GraphQLOperationString, Stringify(GraphQLVariables))
```

Under some circumstances it is also required to cache based on the request initiator. E.g. a user requesting his profile should not receive the cached profile of another user. In such a scenario, building the operation cache key should also include a partial that uniquely identifies the requestor. This could be a user ID extracted from an authorization token.

```
OperationCacheKey (e.g. SHA1) = hash(GraphQLOperationString, Stringify(GraphQLVariables), RequestorId)
```

This allows us to identify recurring operations with the same variables and serve it from the cache for subsequent requests.

But in order to make our cache smart we still need a suitable cache invalidation mechanism.

### Invalidating cached GraphQL Query Operations

Let's take a look at a possible execution result for the GraphQL operation.

**Example: GraphQL Execution Result**

```json
{
  "data": {
    "user": {
      "__typename": "User",
      "id": "1",
      "login": "dotan",
      "repositories": ["codegen"],
      "friends": [
        {
          "__typename": "User",
          "id": "2",
          "login": "urigo"
        },
        {
          "__typename": "User",
          "id": "3",
          "login": "n1ru4l"
        }
      ]
    }
  }
}
```

Many frontend frameworks cache GraphQL operation results in a normalized cache. The identifier for storing the single entities of a GraphQL operation result within the cache is usually the `id` field of object types for schemas that use global unique IDs and a compound of the `__typename` and `id` field for schemas that use non global ID fields.

**Example: Normalized GraphQL Client Cache**

```json
{
  "User:1": {
    "__typename": "User",
    "id": "1",
    "login": "dotan",
    "repositories": ["codegen"],
    "friends": ["$$ref:User:2", "$$ref:User:3"]
  },
  "User:2": {
    "__typename": "User",
    "id": "2",
    "login": "urigo"
  },
  "User:3": {
    "__typename": "User",
    "id": "3",
    "login": "n1ru4l"
  }
}
```

Interestingly, the same strategy for constructing cache keys on the client can also be used on the backend for tracking which GraphQL operations contain which entities. That allows invalidating GraphQL query operation results based on
entity IDs.

For the execution result entity IDS that could be used for invalidating the operation are the following: `User:1`, `User:2` and `User:3`.

And also keep a register that maps entities to cache keys.

```
Entity   List of Operation cache keys that reference a entity

User:1   OperationCacheKey1, OperationCacheKey2, ...
User:2   OperationCacheKey2, OperationCacheKey3, ...
User:3   OperationCacheKey3, OperationCacheKey1, ...
```

This allows us to keep track of which GraphQL operations must be invalidated once a certain entity becomes stale.

The remaining question is, how can we track an entity becoming stale?

As mentioned before, listening to a database write log is a possible option - but the implementation is very specific and differs based on the chosen database type. Time to live is also a possible, but very inaccurate solution.

Another solution is to add invalidation logic within your GraphQL mutation resolvers, which alter the Graph. Furthermore, a common pattern is to select and return affected/mutated entities with the mutation selection set.

For our example from above the following could be a possible mutation.

**Example: GraphQL Mutation**

```graphql
mutation RepositoryAddMutation($userId: ID, $repositoryName: String!) {
  repositoryAdd(userId: $userId, repositoryName: $repositoryName) {
    user {
      id
      repositories
    }
  }
}
```

**Example: GraphQL Mutation Execution Result**

```json
{
  "data": {
    "repositoryAdd": {
      "user": {
        "id": "1",
        "repositories": ["codegen", "envelop"]
      }
    }
  }
}
```

Similar to how to build entity identifiers from the execution result of query operations in order to identify what entities are referenced in which operations, we can extract the entity identifiers from the mutation operation result in order to invalidate affected operations.

In this specific case all operations that select `User:1` should be invalidated.

This method makes the assumption that all mutations by default select affected entities and, furthermore, all mutations of underlying entities are done through the GraphQL gateway. In a scenario where this is not possible, we could still use a hybrid model with other methods such as listening to database write logs, cache invalidation calls within resolvers etc.

## Envelop Response Cache

The envelop response cache plugin now provides primitives and a reference in memory store for implementing and adopting such a cache for any GraphQL server with all the features mentioned above.

The goal of the response cache plugin is to educate how such mechanisms are implemented and furthermore give developers the building blocks for constructing their own global cache with their cloud provider of choice.

Adding a response cache to an existing envelop GraphQL server setup is as easy as adding the plugin:

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

If you need to imperatively invalidate you can do that by providing the cache to the plugin:

```ts
import { envelop } from '@envelop/core';
import { useResponseCache, createInMemoryCache } from '@envelop/response-cache';
import { emitter } from './event-emitter';

const cache = createInMemoryCache();

emitter.on('invalidate', entity => {
  cache.invalidate([
    {
      typename: entity.type,
      id: entity.id,
    },
  ]);
});

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResponseCache({ cache }),
  ],
});
```

The caching behavior can be fully customized. A TTL can be provided global or more granular per type or schema coordinate.

```ts
import { envelop } from '@envelop/core';
import { useResponseCache } from '@envelop/response-cache';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResponseCache({
      // cache operations for 1 hour by default
      ttl: 60 * 1000 * 60,
      ttlPerType: {
        // cache operation containing Stock object type for 500ms
        Stock: 500,
      },
      ttlPerSchemaCoordinate: {
        // cache operation containing Query.rocketCoordinates selection for 100ms
        'Query.rocketCoordinates': 100,
      },
      // never cache responses that include a RefreshToken object type.
      ignoredTypes: ['RefreshToken'],
    }),
  ],
});
```

Need to cache based on the user? No problem.

```ts
import { envelop } from '@envelop/core';
import { useResponseCache } from '@envelop/response-cache';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResponseCache({
      // context is the GraphQL context that would be used for execution
      session: context => (context.user ? String(context.user.id) : null),
      // never serve cache for admin users
      enabled: context => (context.user ? isAdmin(context.user) === false : true),
    }),
  ],
});
```

Don't want to automatically invalidate based on mutations? Also configurable!

```ts
import { envelop } from '@envelop/core';
import { useResponseCache } from '@envelop/response-cache';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResponseCache({
      // some might prefer invalidating only based on a database write log
      invalidateViaMutation: false,
    }),
  ],
});
```

Want a global cache on Redis? Build a cache that implements the `Cache` interface and share it with the community!

```ts
export type Cache = {
  /** set a cache response */
  set(
    /** id/hash of the operation */
    id: string,
    /** the result that should be cached */
    data: ExecutionResult,
    /** array of entity records that were collected during execution */
    entities: Iterable<CacheEntityRecord>,
    /** how long the operation should be cached */
    ttl: number
  ): PromiseOrValue<void>;
  /** get a cached response */
  get(id: string): PromiseOrValue<Maybe<ExecutionResult>>;
  /** invalidate operations via typename or id */
  invalidate(entities: Iterable<CacheEntityRecord>): PromiseOrValue<void>;
};
```

More information about all possible configuration options can be found on [the response cache docs on the Plugin Hub](/plugins/use-response-cache).
