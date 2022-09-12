---
'@envelop/response-cache': minor
---

Allow registering additional resource identifiers based on the execution result.

```tsx
useResponseCache({
  session: () => null,
  cache,
  includeExtensionMetadata: true,
  registerAdditionalIdentifiers: args => {
    args.trackIdentifier({ typename: 'User', id: '10' })
  }
})
```
