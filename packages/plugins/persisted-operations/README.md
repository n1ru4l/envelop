## `@envelop/persisted-operations`

This plugin allow you to enforce execution of persisted (hashed) operation, using a custom store.

The idea behind running persisted operations is to allow clients to run only specific queries, that defined ahead of time. This provides an enhances security and disables (optionally) the execution of other operations. This plugin is useful if you are looking for a way to improve security and reduce network traffic.

## Getting Started

```
yarn add @envelop/persisted-operations
```

## Usage Example

```ts
import { envelop } from '@envelop/core';
import { usePersistedOperations } from '@envelop/parser-cache';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    usePersistedOperations({
      store: myStore,
      onlyPersistedOperations: true, // Change to false, to allow regular operations in addition
    }),
  ],
});
```

Store implementation is based on 2 simple functions, you can connect to any data store that holds your Key => Value data.

Here's a simple example for an in-memory store:

```ts
import { PersistedOperationsStore } from '@envelop/parser-cache';

// You can implement `data` in any custom way, and even fetch it from a remote store.
const data: Record<string, DocumentNode> = {
  'persisted_1': parse(`query`),
};

export const myStore: PersistedOperationsStore = {
  canHandle: key => key && key.startsWith('persisted_');
  get: key => data[key],
}
```

Now, when running operations through your GraphQL server, you can use a key instead of a query language:

```json
{
  "query": "persisted_1",
  "variables": {}
}
```

## With Relay

If you are using Relay, you can leverage `relay-compiler` feature for hashing and and creating the store for you, during build.

You can [read more about this feature here](https://relay.dev/docs/v2.0.0/persisted-queries/). After building your hashes, you can use `queryMap.json` as your store.
