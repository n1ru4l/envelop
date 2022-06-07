---
'@envelop/generic-auth': patch
---

`useGenericAuth`'s `ContextType` generic used to accept the types that has an index signature which makes it impossible to use it with "fixed types". Now it defaults to `DefaultContext` without extending it so any kind of type can be used as `ContextType`.

Also `useGenericAuth` now takes a third generic which is the name of the field name that contains the user data in the context. It can be also inferred from `contextFieldName` of the plugin options.
