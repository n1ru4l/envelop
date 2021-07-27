#### `usePayloadFormatter`

Allow you to format/modify execution result payload before returning it to your consumer.

```ts
import { envelop, usePayloadFormatter } from '@envelop/core';
import { buildSchema } from 'graphql';

const getEnveloped = envelop({
  plugins: [
    usePayloadFormatter(result => {
      // Return a modified result here,
      // Or `false`y value to keep it as-is.
    }),
    // ... other plugins ...
  ],
});
```
