#### `useErrorHandler`

This plugin triggers a custom function every time execution encounter an error.

```ts
import { envelop, useErrorHandler } from '@envelop/core';
import { buildSchema } from 'graphql';

const getEnveloped = envelop({
  plugins: [
    useErrorHandler((error, context) => {
      // This callback is called per each GraphQLError emitted during execution phase
    }),
    // ... other plugins ...
  ],
});
```

> Note: every error is being triggered on it's own. So an execution results will multiple error will yield multiple calls.
