## `@envelop/generic-auth`

This plugin allow you to implement custom authentication flow, by providing a custom user extraction based on the original HTTP request. The extract user is being injected into the GraphQL execution `context` and you can use it in your resolvers to fetch the current user.

> The plugin also comes with an optional `@auth` directive that can be added to your GraphQL schema and helps you to protect your GraphQL schema in a declerative way.

There are several possible flows for using this plugin (see below for setup examples):

- **Option #1 - Complete Protection**: to protect your entire GraphQL schema, by validating the user before executing the request.
- **Option #2 - Fine-grain Protection**: Use the plugin to inject to authenticated user into the `context`, and later you can verify it in your resolvers.
- **Option #3 - Fine-grain Protection with Directives**: Uses `@auth` SDL directive to automatically protect specific GraphQL fields.

## Getting Started

Start by installing the plugin:

```
yarn add @envelop/generic-auth
```

Then, define your authentication methods:

1. Extract your user from the request by implementing `extractUser`:

Use this method to only extract the user from the context, with any custom code, for example:

```ts
import { ExtractUserFn } from '@envelop/generic-auth';

type UserType = {
  id: string;
};

const extractUserFn: ExtractUserFn<UserType> = async context => {
  // Here you can implement any custom sync/async code, and use the context built so far in Envelop and the HTTP request
  // to find the current user.
  // Common practice is to use a JWT token here, validate it, and use the payload as-is, or fetch the user from an external services.
  // Make sure to either return `null` or the user object.

  try {
    const user = await context.authApi.authenticateUser(context.req.headers.authorization);

    return user;
  } catch (e) {
    console.error('Failed to validate token');

    return null;
  }
};
```

2. Define an optional validation method by implementing `validateUser`:

This method is optional, by default, it will just check the value returned by `extractUserFn` and throw an error in case of a falsey value.

```ts
import { ValidateUserFn } from '@envelop/generic-auth';

const validateUser: ValidateUserFn<UserType> = async (user, context) => {
  // Here you can implement any custom to check if the user is valid and have access to the server.
  // This method is being triggered in different flows, besed on the mode you chose to implement.

  if (!user) {
    throw new Error(`Unauthenticated!`);
  }
};
```

Now, configure your plugin based on the mode you with to use:

#### **Option #1 - `authenticate-all` **

This mode offers complete protection for the entire API. It protects your entire GraphQL schema, by validating the user before executing the request.

To setup this mode, use the following config:

```ts
import { envelop } from '@envelop/core';
import { useGenericAuth, ExtractUserFn, ValidateUserFn } from '@envelop/generic-auth';

type UserType = {
  id: string;
};
const extractUserFn: ExtractUserFn<UserType> = async context => {
  /* ... */
};
const validateUser: ValidateUserFn<UserType> = async (user, context) => {
  /* ... */
};

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useGenericAuth({
      extractUserFn,
      validateUser,
      mode: 'authenticate-all',
    }),
  ],
});
```

#### **Option #2 - Fine-grain Protection**

This mode uses the plugin to inject to authenticated user into the `context`, and later you can verify it in your resolvers.

```ts
import { envelop } from '@envelop/core';
import { useGenericAuth, ExtractUserFn, ValidateUserFn } from '@envelop/generic-auth';

type UserType = {
  id: string;
};
const extractUserFn: ExtractUserFn<UserType> = async context => {
  /* ... */
};
const validateUser: ValidateUserFn<UserType> = async (user, context) => {
  /* ... */
};

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useGenericAuth({
      extractUserFn,
      validateUser,
      mode: 'just-extract',
    }),
  ],
});
```

Then, in your resolvers, you can execute the check method based on your needs:

```ts
const resolvers = {
  Query: {
    me: async (root, args, context) => {
      await context.validateUser();
      const currentUser = context.currentUser;

      return currentUser;
    },
  },
};
```

#### **Option #3 - Fine-grain Protection with Directives**

This mode is similar to option #2, but it uses `@auth` SDL directive to automatically protect specific GraphQL fields.

```ts
import { envelop } from '@envelop/core';
import { useGenericAuth, ExtractUserFn, ValidateUserFn } from '@envelop/generic-auth';

type UserType = {
  id: string;
};
const extractUserFn: ExtractUserFn<UserType> = async context => {
  /* ... */
};
const validateUser: ValidateUserFn<UserType> = async (user, context) => {
  /* ... */
};

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useGenericAuth({
      extractUserFn,
      validateUser,
      mode: 'auth-directive',
    }),
  ],
});
```

Then, in your GraphQL schema SDL, you can add `@auth` directive to your fields, and the `validateUser` will get called only while resolving that specific field:

```graphql
type Query {
  me: User! @auth
  protectedField: String @auth
  publicField: String
}
```

> You can apply that directive to any GraphQL `field` definition.
