---
'@envelop/core': minor
---

`useMaskedErrors` now masks errors thrown during context creation (calling `contextFactory`).

It might be possible that you need to load some data during context creation from a remote source that could be unavailable and thus yield in an error being thrown. `useMaskedErrors` now handles such scenarios and prevents leaking such information to clients.

Make sure that the `useMaskedErrors` is added BEFORE any of your context modification plugins are initialized.

✅ context error will be masked

```ts
const getEnveloped = envelop({
  plugins: [
    useMaskedErrors(),
    useExtendContext(() => {
      throw new Error('Oooooops.');
    }),
  ],
});
```

❌ context error will NOT be masked - error might be leaking (depending on your GraphQL server)

```ts
const getEnveloped = envelop({
  plugins: [
    useExtendContext(() => {
      throw new Error('Oooooops.');
    }),
    useMaskedErrors(),
  ],
});
```
