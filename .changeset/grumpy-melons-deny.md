---
'@envelop/core': patch
'@envelop/types': patch
---

Add custom `subscribe` function that behaves like `graphql-js` `subscribe` with an additional parameter for a custom `execute` function that is used for the `ExecuteSubscriptionEvent` phase.

Expose utility functions `getExecuteArgs`, `getSubscribeArgs`, `makeExecute`, and `makeSubscribe` for easier handling of composition with the polymorphic arguments.

Allow hooking into the `ExecuteSubscriptionEvent` phase with the `onExecuteSubscriptionEvent` hook.
