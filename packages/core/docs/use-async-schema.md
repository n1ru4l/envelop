#### `useAsyncSchema`

This plugin is the simplest plugin for specifying your GraphQL schema. You can specify a schema created from any tool that emits `Promise<GraphQLSchema>` object.

```ts
import { envelop, useAsyncSchema } from '@envelop/core';
import { buildSchema } from 'graphql';

const getSchema = async (): Promise<GraphQLSchema> => {
  // return schema when it's ready
};

const getEnveloped = envelop({
  plugins: [
    useAsyncSchema(getSchema()),
    // ... other plugins ...
  ],
});
```
