---
'@envelop/core': minor
'@envelop/types': minor
---

Pass inital context to registerContextErrorHandler

```ts
export const useMyHook = (): Plugin => {
  return {
    onPluginInit(context) {
      context.registerContextErrorHandler(({ initialContext }) => {
        console.error('Error occurred during context creation but at least I have the initial context', initialContext);
      });
    },
  };
};
```
