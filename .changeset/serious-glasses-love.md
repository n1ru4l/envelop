---
'@envelop/extended-validation': patch
---

Ensure the extended validation phase only runs once.

Move shared extended validation rules context instantiation to the `onContextFactory` phase and raise an error when `execute` is invoked without building and passing the `contextValue` returned from `contextFactory`.
