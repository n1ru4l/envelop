---
'@envelop/generic-auth': major
---

Use the extended validation phase instead of resolver wrapping for applying authentication rules.

`onResolverCalled` results in wrapping all resolvers in the schema and can be a severe performance bottle-neck.

Now the authorization rules are applied statically before running any execution logic, which results in the WHOLE operation being rejected as soon as a field in the selection set does not have sufficient permissions.

The mode `protect-auth-directive` has been renamed to `protect-granular`.

The `authDirectiveName` option got renamed to `directiveOrExtensionFieldName`.

Authorization rules for the `protect-all` and `protect-granular`, can be applied via field extensions:

```typescript
// schema.ts
import { GraphQLObjectType, GraphQLInt } from 'graphql';

const GraphQLQueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    foo: {
      type: GraphQLInt,
      resolve: () => 1,
      extensions: {
        skipAuth: true,
        // or auth: true for mode "protect-granular".
      },
    },
  },
});
```
