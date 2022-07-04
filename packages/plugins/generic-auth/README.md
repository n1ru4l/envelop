## `@envelop/generic-auth`

This plugin allows you to implement custom authentication flow by providing a custom user resolver based on the original HTTP request. The resolved user is injected into the GraphQL execution `context`, and you can use it in your resolvers to fetch the current user.

> The plugin also comes with an optional `@auth` directive that can be added to your GraphQL schema and helps you to protect your GraphQL schema in a declarative way.

There are several possible flows for using this plugin (see below for setup examples):

- **Option #1 - Complete Protection**: protected the entire GraphQL schema from unauthenticated access. Allow unauthenticated access for certain fields by annotating them with a `@skipAuth` directive or `skipAuth` field extension.
- **Option #2 - Manual Validation**: the plugin will just resolve the user and injects it into the `context` without validating access to schema field.
- **Option #3 - Granular field access by using schema field directives or field extensions**: Look for an `@auth` directive or `auth` extension field and automatically protect those specific GraphQL fields.

## Getting Started

Start by installing the plugin:

```
yarn add @envelop/generic-auth
```

Then, define your authentication methods:

1. Resolve your user from the request by implementing `resolveUserFn`:

Use this method to only extract the user from the context, with any custom code, for example:

```ts
import { ResolveUserFn } from '@envelop/generic-auth'

type UserType = {
  id: string
}

const resolveUserFn: ResolveUserFn<UserType> = async context => {
  // Here you can implement any custom sync/async code, and use the context built so far in Envelop and the HTTP request
  // to find the current user.
  // Common practice is to use a JWT token here, validate it, and use the payload as-is, or fetch the user from an external services.
  // Make sure to either return `null` or the user object.

  try {
    const user = await context.authApi.authenticateUser(context.req.headers.authorization)

    return user
  } catch (e) {
    console.error('Failed to validate token')

    return null
  }
}
```

2. Define an optional validation method by implementing `validateUser`:

This method is optional; the default method will just verify the value returned by `resolveUser` and throw an error in case of a false value (`false | null | undefined`).

```ts
import { ValidateUserFn } from '@envelop/generic-auth'

const validateUser: ValidateUserFn<UserType> = params => {
  // Here you can implement any custom to check if the user is valid and have access to the server.
  // This method is being triggered in different flows, based on the mode you chose to implement.

  // If you are using the `protect-auth-directive` mode, you'll also get 2 additional parameters: the resolver parameters as object and the DirectiveNode of the auth directive.

  if (!user) {
    throw new Error(`Unauthenticated!`)
  }
}
```

Now, configure your plugin based on the mode you wish to use:

#### Option #1 - `protect-all`

This mode offers complete protection for the entire API. It protects your entire GraphQL schema by validating the user before executing the request. You can optionally skip auth validation for specific GraphQL fields by using the `@skipAuth` directive.

To setup this mode, use the following config:

```ts
import { envelop } from '@envelop/core'
import { useGenericAuth, ResolveUserFn, ValidateUserFn } from '@envelop/generic-auth'

type UserType = {
  id: string
}
const resolveUserFn: ResolveUserFn<UserType> = async context => {
  /* ... */
}
const validateUser: ValidateUserFn<UserType> = params => {
  /* ... */
}

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useGenericAuth({
      resolveUserFn,
      validateUser,
      mode: 'protect-all'
    })
  ]
})
```

##### Allow unauthenticated access for specific fields using a field `directive`

> By default, we assume that you have the GraphQL directive definition as part of your GraphQL schema (`directive @skipAuth on FIELD_DEFINITION`).

Then, in your GraphQL schema SDL, you can add `@skipAuth` directive to your fields, and the `validateUser` will not get called while resolving that specific field:

```graphql
type Query {
  me: User!
  protectedField: String
  publicField: String @skipAuth
}
```

> You can apply that directive to any GraphQL `field` definition, not only to root fields.

> If you are using a different directive for authentication, you can pass `directiveOrExtensionFieldName` configuration to customize it.

##### Allow unauthenticated access for specific fields using a field extension

```typescript
import { GraphQLObjectType, GraphQLInt } from 'graphql'

const GraphQLQueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    foo: {
      type: GraphQLInt,
      resolve: () => 1,
      extensions: {
        skipAuth: true
      }
    }
  }
})
```

> If you want to use a different directive for authentication, you can use the `directiveOrExtensionFieldName` configuration to customize it.

#### Option #2 - `resolve-only`

This mode uses the plugin to inject the authenticated user into the `context`, and later you can verify it in your resolvers.

```ts
import { envelop } from '@envelop/core'
import { useGenericAuth, ResolveUserFn, ValidateUserFn } from '@envelop/generic-auth'

type UserType = {
  id: string
}
const resolveUserFn: ResolveUserFn<UserType> = async context => {
  /* ... */
}
const validateUser: ValidateUserFn<UserType> = async params => {
  /* ... */
}

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useGenericAuth({
      resolveUserFn,
      validateUser,
      mode: 'resolve-only'
    })
  ]
})
```

Then, in your resolvers, you can execute the check method based on your needs:

```ts
const resolvers = {
  Query: {
    me: async (root, args, context) => {
      await context.validateUser()
      const currentUser = context.currentUser

      return currentUser
    }
  }
}
```

#### Option #3 - `protect-granular`

This mode is similar to option #2, but it uses the `@auth` SDL directive or `auth` field extension for protecting specific GraphQL fields.

```ts
import { envelop } from '@envelop/core'
import { useGenericAuth, ResolveUserFn, ValidateUserFn } from '@envelop/generic-auth'

type UserType = {
  id: string
}
const resolveUserFn: ResolveUserFn<UserType> = async context => {
  /* ... */
}
const validateUser: ValidateUserFn<UserType> = params => {
  /* ... */
}

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useGenericAuth({
      resolveUserFn,
      validateUser,
      mode: 'protect-granular'
    })
  ]
})
```

##### Protect a field using a field `directive`

> By default, we assume that you have the GraphQL directive definition as part of your GraphQL schema (`directive @auth on FIELD_DEFINITION`).

Then, in your GraphQL schema SDL, you can add `@auth` directive to your fields, and the `validateUser` will get called only while resolving that specific field:

```graphql
type Query {
  me: User! @auth
  protectedField: String @auth
  # publicField: String
}
```

> You can apply that directive to any GraphQL `field` definition, not only to root fields.

> If you are using a different directive for authentication, you can pass `directiveOrExtensionFieldName` configuration to customize it.

##### Protect a field using a field extension

```typescript
import { GraphQLObjectType, GraphQLInt } from 'graphql'

const GraphQLQueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    foo: {
      type: GraphQLInt,
      resolve: () => 1,
      extensions: {
        auth: true
      }
    }
  }
})
```

> If you are using a different field extension for authentication, you can pass `directiveOrExtensionFieldName` configuration to customize it.

##### Extend authentication with custom directive logic

You can also specify a custom `validateUser` function and get access to a handy object while using the `protect-all` and `protect-granular` mode:

```ts
import { GraphQLError } from 'graphql'
import { ValidateUserFn } from '@envelop/generic-auth'

const validateUser: ValidateUserFn<UserType> = async ({ user }) => {
  // Now you can use the 3rd parameter to implement custom logic for user validation, with access
  // to the resolver data and information.

  if (!user) {
    return new GraphQLError(`Unauthenticated.`)
  }
}
```

And it's also possible to add custom parameters to your `@auth` directive. Here's an example for adding role-aware authentication:

```graphql
enum Role {
  ADMIN
  MEMBER
}

directive @auth(role: Role!) on FIELD_DEFINITION
```

Then, you use the `directiveNode` parameter to check the arguments:

```ts
import { ValidateUserFn } from '@envelop/generic-auth'

const validateUser: ValidateUserFn<UserType> = async ({ user, fieldAuthDirectiveNode }) => {
  // Now you can use the 3rd parameter to implement custom logic for user validation, with access
  // to the resolver data and information.

  if (!user) {
    throw new Error(`Unauthenticated!`)
  }

  const valueNode = fieldAuthDirectiveNode.arguments.find(arg => arg.name.value === 'role').value as EnumValueNode
  const role = valueNode.value

  if (role !== user.role) {
    throw new Error(`No permissions!`)
  }
}
```
