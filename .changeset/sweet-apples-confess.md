---
'@envelop/generic-auth': major
'@envelop/extended-validation': minor
---

Refactor Generic Auth plugin;

- [BREAKING] - Now `@auth` directive is renamed to `@authenticated`. If you want to keep the old name you can configure the plugin to use the old name.

```ts
useGenericAuth({
  // ...
  authDirectiveName: 'auth',
});
```

- [BREAKING] - Now `directiveOrExtensionFieldName` is renamed to `authDirectiveName`.

```diff
useGenericAuth({
  // ...
- directiveOrExtensionFieldName: 'auth',
+ authDirectiveName: 'auth',
});
```

- Now auth directives support `OBJECT` and `INTERFACE` locations, so you can use the auth directive on types as well.

```graphql
directive @authenticated on OBJECT | INTERFACE

type User @authenticated {
    id: ID!
    name: String!
}
```

- `validateUser` function does not receive `fieldAuthDirectiveNode` and `fieldAuthExtension` anymore. Instead, it takes `fieldAuthArgs` which is an object that contains the arguments of the auth directive or extension. So you don't need to parse the arguments manually anymore.

```ts
const validateUser: ValidateUserFn = params => {
  if (!params.fieldAuthArgs.roles.includes('admin')) {
    return createUnauthorizedError(params);
  }
};
```

- `validateUser`'s `objectType` parameter is now renamed to `parentType`. And it takes the original composite type instead of the `GraphQLObjectType` instance. Now it can be `GraphQLInterfaceType` as well.

- `validateUser`'s current parameters are now;

```ts
export type ValidateUserFnParams<UserType> = {
  /** The user object. */
  user: UserType;
  /** The field node from the operation that is being validated. */
  fieldNode: FieldNode;
  /** The parent type which has the field that is being validated. */
  parentType: GraphQLObjectType | GraphQLInterfaceType;
  /** The auth directive arguments for the type */
  typeAuthArgs?: Record<string, any>;
  /** The directives for the type */
  typeDirectives?: ReturnType<typeof getDirectiveExtensions>;
  /** Scopes that type requires */
  typeScopes?: string[][];
  /** Policies that type requires */
  typePolicies?: string[][];
  /** The object field */
  field: GraphQLField<any, any>;
  /** The auth directive arguments for the field */
  fieldAuthArgs?: Record<string, any>;
  /** The directives for the field */
  fieldDirectives?: ReturnType<typeof getDirectiveExtensions>;
  /** Scopes that field requires */
  fieldScopes?: string[][];
  /** Policies that field requires */
  fieldPolicies?: string[][];
  /** Extracted scopes from the user object */
  userScopes: string[];
  /** Policies for the user */
  userPolicies: string[];
  /** The args passed to the execution function (including operation context and variables) **/
  executionArgs: ExecutionArgs;
  /** Resolve path */
  path: ReadonlyArray<string | number>;
};
```

- New directives for role-based auth are added `@requiresScopes` and `@policy` for more granular control over the auth logic.

```graphql
directive @requiresScopes(scopes: [String!]!) on OBJECT | INTERFACE | FIELD_DEFINITION

directive @policy(policy: String!) on OBJECT | INTERFACE | FIELD_DEFINITION
```

Check README for more information.
