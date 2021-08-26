---
'@envelop/core': minor
'@envelop/types': minor
---

Add hook for handling errors thrown during context creation.
This is handy if you want to log, map or mask errors.

```ts
export const useMyHook = (): Plugin => {
  return {
    onContextBuilding() {
      return {
        onError({ error, setError }) {
          console.error('Error occurred during context creation.', error);
          setError(new Error('Something went wrong :('));
        },
        onEnd() {
          console.log('Context creation went fine :)');
        },
      };
    },
  };
};
```
