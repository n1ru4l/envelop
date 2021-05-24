## `@envelop/execute-subscription-event`

Utilities for hooking into the [ExecuteSubscriptionEvent](<https://spec.graphql.org/draft/#ExecuteSubscriptionEvent()>) phase.

### `useContextValuePerExecuteSubscriptionEvent`

Create a new context object per `ExecuteSubscriptionEvent` phase, allowing to bypass common issues with context objects such as [`DataLoader` caching issues](https://github.com/dotansimha/envelop/issues/80).

```ts
import { envelop } from '@envelop/core';
import { useContextValuePerExecuteSubscriptionEvent } from '@envelop/execute-subscription-event';

const getEnveloped = envelop({
  plugins: [
    useContextValuePerExecuteSubscriptionEvent(() => ({
      contextValue: {
        value: 'This context value is re-created every time the ExecuteSubscriptionEvent phase starts',
      },
    })),
    // ... other plugins ...
  ],
});
```
