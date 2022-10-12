---
'@envelop/core': major
---

Remove `graphql` as a peer dependency

We have built the new `envelop` to be engine agnostic. `graphql-js` is no longer a peer dependency. Now you can use any spec compliant GraphQL engine with `envelop` and get the benefit of building a plugin system. We have introduced a new plugin that can be used to customize the GraphQL Engine.

```diff
- import { envelop } from '@envelop/core'
+ import { envelop, useEngine } from '@envelop/core'
+ import { parse, validate, execute, subscribe } from 'graphql';

- const getEnveloped = envelop([ ... ])
+ const getEnveloped = envelop({ plugins: [useEngine({ parse, validate, execute, subscribe })] })

```

Checkout the [migration guide](https://www.the-guild.dev/graphql/envelop/v3/guides/migrating-from-v2-to-v3) for more details.
