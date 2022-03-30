---
'@envelop/core': minor
---

allow masking validation and parse errors with `useMaskedErrors`.

```ts
useMaskedErrors({ onValidate: true, onParse: true });
```

This option is disabled by default as validation and parse errors help the API consumer instead of leaking secret information.

If you want to avoid leaking schema suggestions, we recommend using persisted operations.
