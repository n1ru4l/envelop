---
'@envelop/response-cache': major
---

**BREAKING** Require the user to provide a `session` function by default.

Previously, using the response cache automatically used a global cache. For security reasons there is no longer a default value for the `session` config property. If you did not set the `session` function before and want a global cache that is shared by all users, you need to update your code to the following:

```ts
import { envelop } from '@envelop/core';
import { useResponseCache } from '@envelop/response-cache';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResponseCache({
      // use global cache for all operations
      session: () => null,
    }),
  ],
});
```

Otherwise, you should return from your cache function a value that uniquely identifies the viewer.

```ts
import { envelop } from '@envelop/core';
import { useResponseCache } from '@envelop/response-cache';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useResponseCache({
      // return null as a fallback for caching the result globally
      session: context => context.user?.id ?? null,
    }),
  ],
});
```
