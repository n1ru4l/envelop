---
'@envelop/core': major
---

We have built the new `envelop` to be engine agnostic. `graphql-js` is no longer a peer dependency. Now you can use any spec compliant GraphQL engine with `envelop` and get the benefit of building a plugin system.

```diff
+ import { parse, validate, execute, subscribe } from 'graphql';

- const getEnveloped = envelop([ ... ])
+ const getEnveloped = envelop({ parse, validate, execute, subscribe, plugins: [ ... ] })
```
