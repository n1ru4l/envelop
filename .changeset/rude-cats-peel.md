---
'@envelop/core': major
---

Remove `handleValidationErrors` and `handleParseErrors` options from `useMaskedErrors`.

> ONLY masking validation errors OR ONLY disabling introspection errors does not make sense, as both can be abused for reverse-engineering the GraphQL schema (see https://github.com/nikitastupin/clairvoyance for reverse-engineering the schema based on validation error suggestions).
> https://github.com/n1ru4l/envelop/issues/1482#issue-1340015060
