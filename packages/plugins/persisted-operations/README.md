## `@envelop/persisted-operations`

This plugin allow you to enforce execution of persisted (hashed) operation, using a custom store.

The idea behind running persisted operations is to allow clients to run only specific queries, that defined ahead of time. This provides an enhances security and disables (optionally) the execution of other operations. This plugin is useful if you are looking for a way to improve security and reduce network traffic.

## Getting Started

```
yarn add @envelop/persisted-operations
```

## Usage Example

The most basic implementation can use an in-memory JS `Map` wrapper with a `Store` object:

```ts
import { envelop } from '@envelop/core';
import { usePersistedOperations, InMemoryStore } from '@envelop/persisted-operations';

// You can retrieve the store in any way (e.g. from a remote source) and implement it with a simple Map / Key->Value
const myData = new Map();
myData.set('persisted_1', parse(`query { ... }`));
myData.set('persisted_2', 'query { ... }'));

const store = new InMemoryStore({
  initialData: myData,
})

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    usePersistedOperations({
      store: myStore,
    }),
  ],
});
```

Now, when running operations through your GraphQL server, you can use a key instead of a query language:

```json
{
  "query": "persisted_1",
  "variables": {}
}
```

You can also provide a function to retrieve the operation id from a custom property available in your context / incoming request:

```ts
usePersistedOperations({
  store: myStore,
  extractOperationId: (context) => context.request.body.operationId // get id from custom property in body object
}),
```

## Usage Example with built-in JsonFileStore

```ts
import { usePersistedOperations, JsonFileStore } from '@envelop/persisted-operations';

const persistedOperationsStore = new JsonFilesStore();
const filePath = resolve(process.cwd(), 'assets/client1PersistedOperations.json');

// sync
persistedOperationsStore.loadFromFileSync(filePath); // load and parse persisted-operations files

// or async
await persistedOperationsStore.loadFromFile(filePath); // load and parse persisted-operations files

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    usePersistedOperations({
      store: persistedOperationsStore,
    }),
  ],
});
```

## Multiple Stores

The `store` parameter accepts both a `Store` instance, or a function. If you need to support multiple stores (based on incoming GraphQL operation/HTTP request), you can provide a function to toggle between the stores, based on your needs:

```ts
const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    usePersistedOperations({
      store: context => {
        if (context.req.headers['user-agent'].includes('Android')) {
          return mobileClientsStore;
        }

        return defaultStore;
      },
    }),
  ],
});

// later, pass the initial context
const proxyFns = getEnveloped({ req });
```

## With Relay

If you are using Relay, you can leverage `relay-compiler` feature for hashing and and creating the store for you, during build.

You can [read more about this feature here](https://relay.dev/docs/guides/persisted-queries/). After building your hashes, you can use `queryMap.json` as your store.
