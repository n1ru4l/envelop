---
'@envelop/sentry': major
---

Allow to provide the context type as a generic parameter

**Breaking Change:** Since this introduces a typed context as a generic, TS will not always infer
the correct type for you. If you have a custom Context type, please consider explicitly pass this
context type as a generic argument:

```ts
cont yoga = createYoga<CustomContext>({
  plugins: [
    useSentry<CustomContext>({
      //...
    })
  ]
})
```
