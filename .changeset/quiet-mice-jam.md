---
'@envelop/core': major
---

Remove `enableIf` utility in favor of more type safe way to conditionally enable plugins. It wasn't a great experience to have a utility

We can easily replace usage like this:

```diff
- import { envelop, useMaskedErrors, enableIf } from '@envelop/core'
+ import { envelop, useMaskedErrors } from '@envelop/core'
import { parse, validate, execute, subscribe } from 'graphql'

const isProd = process.env.NODE_ENV === 'production'

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    // This plugin is enabled only in production
-    enableIf(isProd, useMaskedErrors())
+    isProd && useMaskedErrors()
  ]
})
```
