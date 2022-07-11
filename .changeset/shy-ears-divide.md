---
'@envelop/response-cache': major
---

**Better default document string storage**

Previously non parsed operation document was stored in the context with a symbol to be used "documentString" in the later. But this can be solved with a "WeakMap" so the modification in the context is no longer needed.

**BREAKING CHANGE**: Replace `getDocumentStringFromContext` with `getDocumentString`

However, some users might provide document directly to the execution without parsing it via `parse`. So in that case, we replaced the context parameter with the execution args including `document`, `variableValues` and `contextValue` to the new `getDocumentString`.

Now a valid document string should be returned from the new `getDocumentString`.

**Custom document string caching example.**

```ts
const myCache = new WeakMap<DocumentNode, string>()

// Let's say you keep parse results in somewhere else like below
function parseDocument(document: string): DocumentNode {
  const parsedDocument = parse(document)
  myCache.set(parsedDocument, document)
  return parsedDocument
}

// Then you can interact with your existing caching solution inside the response cache plugin like below
useResponseCache({
  getDocumentString(document: DocumentNode): string {
    // You can also add a fallback to `graphql-js`'s print function
    // to let the plugin works
    const possibleDocumentStr = myCache.get(document)
    if (!possibleDocumentStr) {
      console.warn(`Something might be wrong with my cache setup`)
      return print(document)
    }
    return possibleDocumentStr
  }
})
```

**Migration from `getDocumentStringFromContext`.**

So if you use `getDocumentStringFromContext` like below before;

```ts
function getDocumentStringFromContext(contextValue: any) {
  return contextValue.myDocumentString
}
```

You have to change it to the following;

```ts
import { print } from 'graphql'
function getDocumentString(executionArgs: ExecutionArgs) {
  // We need to fallback to `graphql`'s print to return a value no matter what.
  return executionArgs.contextValue.myDocumentString ?? print(executionArgs.document)
}
```
