---
'@envelop/core': major
---

The `addPlugin` function now insert the plugin in place in the plugin list, leading to a more
predictable execution order.

**Breaking Change:** This change alter the execution order of plugins. This can break some plugins
that was relying on the fact the `addPlugin` allowed to push a plugin to the end of the plugin list.

If it is the case, the best fix is to reorder the plugin list and ensure the plugin is in the right
position, after all its dependencies.
