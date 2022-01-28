---
'@envelop/core': minor
---

Add new plugin `useImmediateIntrospection` for speeding up introspection only operations by skipping context building.

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
