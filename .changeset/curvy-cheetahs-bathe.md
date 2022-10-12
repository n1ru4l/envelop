---
'@envelop/core': major
'@envelop/on-resolve': major
---

## Remove `onResolverCalled`

We decided to drop onResolverCalled hook and instead [provide a new plugin](https://github.com/n1ru4l/envelop/pull/1500) that will let you hook into this phase.

```diff
import { parse, validate, execute, subscribe } from 'graphql'
import { envelop, Plugin, useEngine } from '@envelop/core'
+ import { useOnResolve } from '@envelop/on-resolve'

import { onResolverCalled } from './my-resolver'

function useResolve(): Plugin {
  return {
-   onResolverCalled: onResolverCalled,
+   onPluginInit: ({ addPlugin }) => {
+     addPlugin(useOnResolve(onResolverCalled))
+   },
  }
}

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, execute, subscribe }),
    // ... other plugins ...
    useResolve(),
  ],
});
```
