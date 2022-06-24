---
'@envelop/response-cache': patch
---

Previously non parsed operation document was stored in the context with a symbol to be used "documentString" in the later. But this can be solved with "WeakMap" so "getDocumentStringFromContext" is no longer needed and both "defaultGetDocumentStringFromContext" and getDocumentStringFromContext options are now deprecated and will be removed in the next major release.
