---
'@envelop/newrelic': major
---

Set a custom operation name through a function that reads from context

## 🚀 Breaking Change:

In order to set a custom operation name, you can no longer use the `operationNameProperty` option.  
You will, instead, be able to use the new function `extractOperationName` which receives the context and so allows for greater customisation by accessing nested properties or context extensions from other Envelop plugins.

```ts
const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useNewRelic({
      ...
      extractOperationName: (context) => context.request.body.customOperationName
    }),
  ],
});
```
