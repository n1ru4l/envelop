---
'@envelop/core': minor
'@envelop/types': minor
---

Pass context to registerContextErrorHandler

```ts
export const useMyHook = (): Plugin => {
  return {
    onPluginInit(context) {
      context.registerContextErrorHandler(({ context }) => {
        console.error('Error occurred during context creation but at least I have the  context so far', context);
      });
    },
  };
};
```
