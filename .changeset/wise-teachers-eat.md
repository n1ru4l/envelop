---
'@envelop/core': patch
---

The context is now referentialy stable. It means the context passed to all hooks and to all resolver
is guaranted to always be the same object instance. This unique object instance will be mutated as
needed to extend the context.
