---
'@envelop/core': minor
---

Support including the original error stack for masked errors within the error extensions via the `isDev` option and the `defaultErrorFormatter`.

```ts
useMaskedErrors({ isDev: true });
```

On Node.js environments the `isDev` default value is `true` if `globalThis.process.env["NODE_ENV"]` is equal to `"development"`. Otherwise, the default value is ALWAYS `false`.

---

The `FormatErrorHandler` now has a third argument `isDev` which is forwarded from the configuration and can be used for customizing the formatter behavior in development mode.
