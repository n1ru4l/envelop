---
'@envelop/core': minor
---

allow masking validation and parse errors with `useMaskedErrors`.

```ts
useMaskedErrors({
  handleParseErrors: true,
  handleValidateErrors: true,
});
```

This option is disabled by default as validation and parse errors are expected errors that help the API consumer instead of leaking secret information.

If you want to avoid leaking schema suggestions, we recommend using persisted operations.
