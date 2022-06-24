---
'@envelop/response-cache': patch
---

## Better document string storage by default

Previously non parsed operation document was stored in the context with a symbol to be used "documentString" in the later. But this can be solved with a "WeakMap" so the modification in the context is no longer needed.

## More flexible `getDocumentStringFromContext`

However, some users might provide document directly to the execution without parsing it via `parse`. So in that case, we added a second parameter to the `getDocumentStringFromContext` function which contains all execution arguments.
