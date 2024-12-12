---
'@envelop/sentry': major
---

Make it possible to get the active span in the GraphQL resolver

**Breaking Change:** With this change, this plugin now wraps the execute function.
This plugin should be placed last so that the execute function is not overwritten by another plugin.

```ts
const yoga = createYoga({
  plugins: [
    ...otherPlugins,
    useSentry({
      // ...
    })
  ]
})
```
