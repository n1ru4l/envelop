#### `useImmediateIntrospection`

Context building can be costly and require calling remote services.
For simple GraphQL operations that only select introspection fields building a context is not necessary.

The `useImmediateIntrospection` can be used to short circuit any further context building if a GraphQL operation selection set only includes introspection fields within the selection set.

```ts
import { envelop, useImmediateIntrospection } from '@envelop/core';
import { schema } from './schema';

const getEnveloped = envelop({
  plugins: [
    useSchema(schema),
    useImmediateIntrospection(),
    // additional plugins
  ],
});
```

In case you want to authorize that an user is authenticated before allowing introspection the plugin must be placed in front of the `useImmediateIntrospection()` call.

```ts
import { envelop, useImmediateIntrospection } from '@envelop/core';
import { schema } from './schema';
import { useAuthorization } from './useAuthorization';

const getEnveloped = envelop({
  plugins: [
    useSchema(schema),
    useAuthorization(), // place this before
    useImmediateIntrospection(),
    // additional plugins
  ],
});
```
