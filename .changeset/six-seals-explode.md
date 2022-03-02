---
'@envelop/generic-auth': major
---

Use the extended validation phase instead of resolver wrapping for applying authentication rules.

`onResolverCalled` results in wrapping all resolvers in the schema and can be a severe performance bottle-neck.

Now the authorization rules are applied statically before running any execution logic, which results in the WHOLE operation being rejected as soon as a field in the selection set does not have sufficient permissions.
