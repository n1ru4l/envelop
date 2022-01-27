---
'@envelop/core': major
---

Move `onResolversCalled` from within `OnExecuteHookResult` and `OnSubscribeHookResult` to the `Plugin` type.

```diff
import type { Plugin } from "@envelop/core";

const plugin: Plugin = {
  onExecute() {
-    return {
-      onResolversCalled() {}
-    }
-  }
+  },
+  onResolversCalled() {},
}
```

We highly recommend avoiding to use any plugins that use `onResolversCalled` within your production environment as it has severe impact on the performance of the individual resolver functions within your schema.

The schema resolver functions are now ONLY wrapped if any plugin in your envelop setup uses the `onResolversCalled` hook.

If you need any shared state between `onExecute` and `onResolversCalled` you can share it by extending the context object.

```ts
import type { Plugin } from '@envlop/core';

const sharedStateSymbol = Symbol('sharedState');

const plugin: Plugin = {
  onExecute({ extendContext }) {
    extendContext({ [sharedStateSymbol]: { value: 1 } });
  },
  onResolversCalled({ context }) {
    const sharedState = context[sharedStateSymbol];
    // logs 1
    console.log(sharedState.value);
  },
};
```
