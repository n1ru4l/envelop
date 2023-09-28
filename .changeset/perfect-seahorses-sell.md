---
'@envelop/graphql-jit': patch
---

Provide a custom JSON serializer in `stringify` property so you can use it in your server
implementation like;

```ts
const result = await enveloped.execute(...);
const resultInStr = result.stringify(result);
```
